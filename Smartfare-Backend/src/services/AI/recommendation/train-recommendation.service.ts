import { TrainPriceHistoryRecord } from "../../../models/database.model";
import { generateWithFallback } from "../gemini-models.service";
import {
    TrainAnalysisResult,
    TrainRecommendationResult,
    TrainSearchOffer,
} from "../types/train-ai.types";

function buildFallbackRecommendation(
    analysis: TrainAnalysisResult
): TrainRecommendationResult {
    const bestOffer = analysis.bestOffer;

    if (!bestOffer) {
        return {
            recommendedAction: "monitor",
            confidence: "low",
            reasoning: "Non ci sono offerte disponibili per i filtri selezionati.",
            suggestion: "Prova a cambiare data o tratta per ottenere più risultati.",
            bestChoiceSummary: "Nessuna offerta consigliata.",
            alternativesSummary: [],
            travelStrategy: "Amplia la ricerca su date o città vicine per ottenere più opzioni.",
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
        reasoning: `L'offerta migliore è ${bestOffer.company} perché combina bene prezzo, durata, cambi e andamento del prezzo.`,
        suggestion: bestOffer.advice === "book_now"
            ? "Conviene prenotare adesso, perché il prezzo appare favorevole."
            : bestOffer.advice === "wait"
                ? "Può avere senso aspettare ancora un po' e monitorare il prezzo."
                : "Il prezzo sembra stabile, quindi la scelta dipende soprattutto dalla tua flessibilità.",
        bestChoiceSummary: `${bestOffer.company} da ${bestOffer.departure} a ${bestOffer.arrival} a ${bestOffer.price} euro.`,
        alternativesSummary: analysis.alternatives.map((offer) =>
            `${offer.company} a ${offer.price} euro, ${offer.duration}, ${offer.comment}`
        ),
        travelStrategy: bestOffer.advice === "book_now"
            ? "Blocca questa offerta e considera le alternative solo come piano B."
            : bestOffer.advice === "wait"
                ? "Monitora l'andamento del prezzo e confronta soprattutto l'offerta più economica."
                : "Tieni monitorata la tratta, ma puoi prenotare anche ora se la tua partenza è poco flessibile.",
        warning: bestOffer.trend === "new"
            ? "Lo storico è ancora limitato: il consiglio è basato soprattutto sui dati attuali."
            : undefined,
    };
}

export async function generateTrainRecommendation(
    offers: TrainSearchOffer[],
    history: TrainPriceHistoryRecord[],
    analysis: TrainAnalysisResult,
    userPreference?: string
): Promise<TrainRecommendationResult> {
    const shortlistedOffers = offers.slice(0, 8);
    const shortlistedHistory = history
        .filter((item) => shortlistedOffers.some((offer) => offer.trainOfferId === item.trainOfferId))
        .slice(0, 8);

    const prompt = `
Sei un travel advisor AI specializzato in viaggi in treno.
Non limitarti a riassumere i dati: devi prendere una decisione pratica su quale treno conviene scegliere e se l'utente dovrebbe prenotare ora, aspettare oppure monitorare.

OFFERTE TROVATE:
${JSON.stringify(shortlistedOffers, null, 2)}

STORICO PREZZI APPENA CALCOLATO:
${JSON.stringify(shortlistedHistory, null, 2)}

ANALISI BACKEND:
${JSON.stringify(analysis, null, 2)}

PREFERENZA UTENTE:
${userPreference ?? "Nessuna preferenza specifica"}

Regole:
- non inventare dati che non esistono
- usa il risultato dell'analisi backend come base principale
- valuta insieme risparmio, durata, cambi e disponibilità
- spiega se il prezzo è in calo, aumento o stabile
- se lo storico è limitato, abbassa la confidenza e dichiaralo
- sii concreto, deciso e utile
- produci un consiglio operativo, non solo descrittivo

Rispondi SOLO in JSON valido nel formato:
{
  "recommendedAction": "book_now | wait | monitor",
  "confidence": "high | medium | low",
  "reasoning": "spiegazione principale",
  "suggestion": "consiglio finale",
  "bestChoiceSummary": "riassunto dell'offerta migliore",
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

        return JSON.parse(jsonMatch[0]) as TrainRecommendationResult;
    } catch (error) {
        console.error("Errore raccomandazione treni con Gemini:", error);
        return buildFallbackRecommendation(analysis);
    }
}
