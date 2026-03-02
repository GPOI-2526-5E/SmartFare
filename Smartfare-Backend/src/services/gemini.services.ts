import { GoogleGenerativeAI } from "@google/generative-ai";
import { TrainSearchParams } from "../models/train-search-params"
import { TrainOffer } from "../models/train-offer";
import { FlightSearchParams } from "../models/flight-search-params";
import { FlightOffer } from "../models/flight-offer";
import { AIRecommendation } from '../models/AI-recommendation';
import { getCollection, getDatabase } from "../config/database";

import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const GEMINI_MODELS = (process.env.GEMINI_MODEL || "")
  .split(",")
  .map((m) => m.trim())
  .filter((m) => m.startsWith("gemini-"));

export class GeminiService {

  private getModel(modelName: string) {
    return genAI.getGenerativeModel({ model: modelName })
  }
  private async generateWithFallback(prompt: string) {
    let lastError: unknown;

    for (const model of GEMINI_MODELS) {
      try {
        const result = await this.getModel(model).generateContent(prompt);
        return result.response;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }
  /**
   * Generic search for offers. Supports `train` (default) and `flight`.
   * Returns an array of normalized offers (shape may vary depending on mode).
   */
  async searchOffers(params: any, mode: "train" | "flight" = "train"): Promise<any[]> {
    try {
      console.log(`🔌 Avvio query DB (${mode.toUpperCase()})`, {
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers || 1,
      });

      const collectionName = mode === "flight" ? "Flights" : "Trains";
      const collection = getCollection(collectionName);
      const { datePrefix, startDate, endDate } = this.normalizeDateInput(params.date);
      const dateRegex = datePrefix ? new RegExp(`^${this.escapeRegex(datePrefix)}(?:$|T)`) : undefined;

      console.log("🗓️ Filtro data normalizzato", {
        datePrefix,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      });

      const departureRegex = new RegExp(`^${this.escapeRegex(params.from)}$`, "i");
      const arrivalRegex = new RegExp(`^${this.escapeRegex(params.to)}$`, "i");

      // Support multiple possible field names for departure/arrival across collections
      const departureFields = ["departure", "departureAirport", "origin", "from"];
      const arrivalFields = ["arrival", "arrivalAirport", "destination", "to"];

      const orClauses: any[] = [];
      for (const f of departureFields) orClauses.push({ [f]: departureRegex });
      for (const f of arrivalFields) orClauses.push({ [f]: arrivalRegex });

      const filter: any = { $and: [] };
      filter.$and.push({ $or: orClauses.slice(0, departureFields.length) });
      filter.$and.push({ $or: orClauses.slice(departureFields.length) });

      if (startDate && endDate && dateRegex) {
        filter.$and.push({
          $or: [
            { departureTime: { $gte: startDate, $lt: endDate } },
            { departureTime: { $regex: dateRegex } },
            { departureDate: { $regex: dateRegex } },
          ],
        });
      } else if (dateRegex) {
        filter.$and.push({ $or: [{ departureTime: { $regex: dateRegex } }, { departureDate: { $regex: dateRegex } }] });
      }

      // Simplify filter if empty
      const finalFilter = filter.$and.length > 0 ? filter : {};

      console.log(`🔍 Filtro query ${collectionName}`, finalFilter);

      const docs = await collection.find(finalFilter).toArray();

      console.log(`✅ ${collectionName} trovati`, { count: docs.length });

      if (docs.length === 0) {
        try {
          const database = getDatabase();
          const estimatedCount = await collection.estimatedDocumentCount();
          const sampleDoc = await collection.findOne();

          console.log(`🧪 ${collectionName} diagnostics`, {
            dbName: database.databaseName,
            collection: collectionName,
            estimatedCount,
            sampleKeys: sampleDoc ? Object.keys(sampleDoc) : [],
            sampleDepartureTime: sampleDoc?.departureTime ?? sampleDoc?.departureDate,
            sampledeparture: sampleDoc?.departure ?? sampleDoc?.departure,
            samplearrival: sampleDoc?.arrival ?? sampleDoc?.arrival,
          });
        } catch (diagError) {
          console.error(`❌ Errore diagnostica ${collectionName}:`, diagError);
        }
      }

      const offers = docs.map((doc: any) => this.mapDocumentToOffer(doc, mode, datePrefix));
      return offers;
    } catch (error) {
      console.error(`Errore ricerca DB (${mode}):`, error);
      return [];
    }
  }

  // Backwards-compatible wrappers
  async searchTrainOffers(params: TrainSearchParams): Promise<TrainOffer[]> {
    return (await this.searchOffers(params, "train")) as TrainOffer[];
  }

  async searchFlightOffers(params: FlightSearchParams): Promise<FlightOffer[]> {
    return (await this.searchOffers(params, "flight")) as FlightOffer[];
  }

  async getRecommendations(
    offers: any[],
    userPreferences?: {
      maxPrice?: number;
      preferredTime?: string;
      maxChanges?: number;
    }
  ): Promise<AIRecommendation> {
    const prompt = `
Sei un esperto consulente di viaggi in treno. Analizza queste offerte e fornisci una raccomandazione:

OFFERTE DISPONIBILI:
${JSON.stringify(offers, null, 2)}

PREFERENZE UTENTE:
${userPreferences ? JSON.stringify(userPreferences, null, 2) : "Nessuna preferenza specifica"}

Fornisci un'analisi dettagliata in formato JSON:
{
  "bestOffer": <l'offerta migliore tra quelle disponibili>,
  "reasoning": "Spiegazione dettagliata del perché questa è la scelta migliore",
  "alternatives": [<array di 2-3 alternative valide>],
  "priceAnalysis": "Analisi dei prezzi e confronto tra le offerte",
  "suggestion": "Consiglio finale: quando comprare, cosa considerare, ecc."
}

Considera:
- Rapporto qualità/prezzo
- Tempo di viaggio
- Numero di cambi
- Disponibilità
- Preferenze utente
Se sono presenti campi come "previousPrice" o "priceTrend", indica se il prezzo e' in aumento, in discesa o stabile.

IMPORTANTE: Rispondi SOLO con un JSON valido, senza testo aggiuntivo.
`;

    try {
      const response = await this.generateWithFallback(prompt);
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Risposta non valida da Gemini");
      }

      const recommendation: AIRecommendation = JSON.parse(jsonMatch[0]);
      return recommendation;
    } catch (error) {
      console.error("Errore raccomandazione con Gemini:", error);

      // Fallback: seleziona la migliore offerta manualmente
      const sortedOffers = [...offers].sort((a, b) => {
        const scoreA = this.calculateOfferScore(a);
        const scoreB = this.calculateOfferScore(b);
        return scoreB - scoreA;
      });

      return {
        bestOffer: sortedOffers[0],
        reasoning: "Migliore rapporto qualità/prezzo considerando tempo di viaggio e costi",
        alternatives: sortedOffers.slice(1, 3),
        priceAnalysis: `Prezzi da ${Math.min(...offers.map((o) => o.price))}€ a ${Math.max(...offers.map((o) => o.price))}€`,
        suggestion: "Confronta le alternative in base alle tue preferenze di viaggio"
      };
    }
  }

  private calculateOfferScore(offer: any): number {
    let score = 100;

    // Penalizza prezzo alto
    score -= offer.price * 0.5;

    // Penalizza cambi / scali
    const changes = offer.changes ?? offer.stops ?? 0;
    score -= changes * 10;

    // Penalizza durata (estrai ore)
    const durationMatch = offer.duration.match(/(\d+)h/);
    if (durationMatch) {
      score -= parseInt(durationMatch[1]) * 5;
    }

    // Bonus per disponibilità
    if (offer.availability === "disponibile") {
      score += 20;
    }

    return score;
  }

  private mapDocumentToOffer(doc: any, mode: "train" | "flight", datePrefix?: string): any {
    const departureParts = this.extractDateTimeParts(doc.departureTime || doc.departureDate);
    const arrivalParts = this.extractDateTimeParts(doc.arrivalTime || doc.arrivalDate);
    const priceInfo = this.extractPriceTrend(doc);

    const departure = doc.departure || doc.departureAirport || doc.origin || doc.from || "";
    const arrival = doc.arrival || doc.arrivalAirport || doc.destination || doc.to || "";

    const base = {
      provider: doc.company || doc.airline || "",
      departureDate: departureParts.date || datePrefix || "",
      departureTime: departureParts.time || "",
      arrivalTime: arrivalParts.time || "",
      duration: this.formatDuration(doc.durationMin, doc.duration),
      price: Number(doc.priceEUR ?? doc.price ?? 0),
      availability: this.mapAvailability(doc.seatsAvailable ?? doc.availableSeats),
      link: doc.link,
      departure,
      arrival,
      ...priceInfo,
    } as any;

    if (mode === "train") {
      return {
        ...base,
        company: base.provider,
        trainType: doc.trainType || "",
        changes: Number(doc.changes ?? 0),
      };
    }

    // flight
    return {
      ...base,
      airline: base.provider,
      flightNumber: doc.flightNumber || doc.trainType || "",
      stops: Number(doc.stops ?? doc.changes ?? 0),
      cabin: doc.cabin || undefined,
    };
  }

  private normalizeDateInput(dateInput: string): {
    datePrefix?: string;
    startDate?: Date;
    endDate?: Date;
  } {
    if (!dateInput) {
      return {};
    }

    const isoMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const itaMatch = dateInput.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    let datePrefix: string | undefined;

    if (isoMatch) {
      datePrefix = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    } else if (itaMatch) {
      datePrefix = `${itaMatch[3]}-${itaMatch[2]}-${itaMatch[1]}`;
    } else {
      const parsed = new Date(dateInput);
      if (!Number.isNaN(parsed.getTime())) {
        datePrefix = parsed.toISOString().slice(0, 10);
      }
    }

    if (!datePrefix) {
      return {};
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePrefix)) {
      return {};
    }

    const startDate = new Date(`${datePrefix}T00:00:00.000Z`);
    const endDate = new Date(`${datePrefix}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    return { datePrefix, startDate, endDate };
  }

  private extractDateTimeParts(value: unknown): { date?: string; time?: string } {
    if (typeof value === "string") {
      const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
      if (match) {
        return { date: match[1], time: match[2] };
      }

      const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})$/);
      if (dateOnly) {
        return { date: dateOnly[1] };
      }
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return {
        date: value.toISOString().slice(0, 10),
        time: value.toISOString().slice(11, 16),
      };
    }

    return {};
  }

  private formatDuration(durationMin?: number, durationText?: string): string {
    if (typeof durationText === "string" && durationText.trim().length > 0) {
      return durationText;
    }

    if (typeof durationMin === "number" && !Number.isNaN(durationMin)) {
      const hours = Math.floor(durationMin / 60);
      const minutes = durationMin % 60;
      return `${hours}h ${minutes}min`;
    }

    return "";
  }

  private mapAvailability(seatsAvailable?: number): string {
    if (typeof seatsAvailable !== "number") {
      return "disponibile";
    }

    if (seatsAvailable <= 0) {
      return "esaurito";
    }

    if (seatsAvailable <= 10) {
      return "pochi posti";
    }

    return "disponibile";
  }

  private extractPriceTrend(train: any): { previousPrice?: number; priceTrend?: string } {
    const currentPrice = Number(train.priceEUR ?? train.price ?? NaN);
    const previousPrice = Number(
      train.previousPriceEUR ?? train.previousPrice ?? train.lastPrice ?? NaN
    );

    if (Number.isNaN(currentPrice) || Number.isNaN(previousPrice)) {
      return {};
    }

    if (currentPrice > previousPrice) {
      return { previousPrice, priceTrend: "in aumento" };
    }

    if (currentPrice < previousPrice) {
      return { previousPrice, priceTrend: "in discesa" };
    }

    return { previousPrice, priceTrend: "stabile" };
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}


export const geminiService = new GeminiService();