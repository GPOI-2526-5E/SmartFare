import { RoomPriceHistoryRecord } from "../../../models/database.model";
import { generateWithFallback } from "../gemini-models.service";
import {
    HotelAnalysisResult,
    HotelRecommendationResult,
    HotelSearchOffer,
} from "../types/hotel-ai.types";

function buildFallbackRecommendation(analysis: HotelAnalysisResult): HotelRecommendationResult {
    const bestOffer = analysis.bestOffer;

    if (!bestOffer) {
        return {
            recommendedAction: "monitor",
            confidence: "low",
            reasoning: "Non ci sono hotel disponibili per i filtri selezionati.",
            suggestion: "Prova a cambiare destinazione, date o numero di persone.",
            bestChoiceSummary: "Nessun hotel consigliato.",
            alternativesSummary: [],
            travelStrategy: "Amplia il range di ricerca per ottenere più opzioni.",
            warning: "Con i dati attuali non è possibile formulare una raccomandazione affidabile.",
        };
    }

    const recommendedAction = bestOffer.advice === "book_now"
        ? "book_now"
        : bestOffer.advice === "wait"
            ? "wait"
            : "monitor";

    return {
        recommendedAction,
        confidence: bestOffer.trend === "new" ? "medium" : "high",
        reasoning: `L'hotel migliore è ${bestOffer.name} perché combina bene prezzo di ingresso, qualità della struttura, servizi disponibili e andamento del prezzo.`,
        suggestion: bestOffer.advice === "book_now"
            ? "Conviene prenotare adesso, perché il prezzo appare favorevole."
            : bestOffer.advice === "wait"
                ? "Può avere senso aspettare e monitorare ancora il prezzo."
                : "Il prezzo sembra stabile, quindi la scelta dipende soprattutto dalle tue preferenze.",
        bestChoiceSummary: `${bestOffer.name}, da ${bestOffer.minTotalPrice} euro totali per ${bestOffer.nights} notti con camera ${bestOffer.bestRoom.roomType}.`,
        alternativesSummary: analysis.alternatives.map((offer) =>
            `${offer.name} da ${offer.minTotalPrice} euro, ${offer.stars} stelle, ${offer.comment}`
        ),
        travelStrategy: bestOffer.advice === "book_now"
            ? "Blocca questo hotel se ti convince, perché la camera migliore a quel prezzo può sparire in fretta."
            : bestOffer.advice === "wait"
                ? "Controlla di nuovo il prezzo e confrontalo con l'opzione più economica."
                : "Tieni monitorato l'hotel, ma puoi prenotare anche ora se la tua vacanza è poco flessibile.",
        warning: bestOffer.trend === "new"
            ? "Lo storico è ancora limitato: il consiglio è basato soprattutto sui dati attuali."
            : undefined,
    };
}

export async function generateHotelRecommendation(
    offers: HotelSearchOffer[],
    history: RoomPriceHistoryRecord[],
    analysis: HotelAnalysisResult,
    userPreference?: string
): Promise<HotelRecommendationResult> {
    const shortlistedOffers = offers.slice(0, 8);
    const shortlistedHistory = history
        .filter((item) => shortlistedOffers.some((offer) => offer.bestRoom.roomId === item.room_id))
        .slice(0, 8);

    const prompt = `
Sei un travel advisor AI specializzato in soggiorni in hotel.
Devi consigliare in modo pratico quale hotel conviene scegliere e se l'utente dovrebbe prenotare ora, aspettare oppure monitorare.

HOTEL TROVATI:
${JSON.stringify(shortlistedOffers, null, 2)}

STORICO PREZZI CAMERE:
${JSON.stringify(shortlistedHistory, null, 2)}

ANALISI BACKEND:
${JSON.stringify(analysis, null, 2)}

PREFERENZA UTENTE:
${userPreference ?? "Nessuna preferenza specifica"}

Regole:
- non inventare dati che non esistono
- usa l'analisi backend come base principale
- valuta prezzo totale, prezzo per notte, stelle, servizi e andamento del prezzo
- spiega se il prezzo è in calo, aumento o stabile
- se lo storico è limitato, abbassa la confidenza e dichiaralo
- sii concreto, deciso e utile

Rispondi SOLO in JSON valido nel formato:
{
  "recommendedAction": "book_now | wait | monitor",
  "confidence": "high | medium | low",
  "reasoning": "spiegazione principale",
  "suggestion": "consiglio finale",
  "bestChoiceSummary": "riassunto dell'hotel migliore",
  "alternativesSummary": ["alternativa 1", "alternativa 2"],
  "travelStrategy": "strategia pratica da seguire",
  "warning": "eventuale limite o avviso"
}
`;

    try {
        const response = await generateWithFallback(prompt);
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error("Risposta non valida da Gemini");
        }

        return JSON.parse(jsonMatch[0]) as HotelRecommendationResult;
    } catch (error) {
        console.error("Errore raccomandazione hotel con Gemini:", error);
        return buildFallbackRecommendation(analysis);
    }
}
