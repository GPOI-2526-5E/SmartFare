import { RoomPriceHistoryRecord } from "../../../models/database.model";
import { generateWithFallback } from "../gemini-models.service";
import {
    HotelAnalysisResult,
    HotelRecommendationResult,
    HotelSearchOffer,
} from "../types/hotel-ai.types";

function isGeminiQuotaError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "status" in error && (error as { status?: number }).status === 429;
}

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
    const discountText = bestOffer.changePercent !== null && bestOffer.changePercent < 0
        ? `Il prezzo è sceso del ${Math.abs(bestOffer.changePercent)}% rispetto alla rilevazione precedente.`
        : "";

    return {
        recommendedAction,
        confidence: bestOffer.trend === "new" ? "medium" : "high",
        reasoning: `Consiglio ${bestOffer.name} perché unisce prezzo competitivo (${bestOffer.minTotalPrice} euro totali), qualità della struttura (${bestOffer.stars} stelle) e disponibilità utile per il tuo viaggio. ${discountText}`.trim(),
        suggestion: bestOffer.advice === "book_now"
            ? bestOffer.changePercent !== null && bestOffer.changePercent < 0
                ? `Prenota ora: è ancora in offerta e il prezzo è in calo del ${Math.abs(bestOffer.changePercent)}%.`
                : "Prenota ora: il prezzo è favorevole e la disponibilità può finire presto."
            : bestOffer.advice === "wait"
                ? "Può avere senso aspettare e monitorare ancora il prezzo."
                : "Il prezzo sembra stabile, quindi la scelta dipende soprattutto dalle tue preferenze.",
        bestChoiceSummary: `${bestOffer.name}: ${bestOffer.minTotalPrice} euro totali per ${bestOffer.nights} notti, camera ${bestOffer.bestRoom.roomType}, ${bestOffer.availableRooms} opzioni disponibili. ${discountText}`.trim(),
        alternativesSummary: analysis.alternatives.map((offer) =>
            `${offer.name} da ${offer.minTotalPrice} euro, ${offer.stars} stelle, ${offer.comment}`
        ),
        travelStrategy: bestOffer.advice === "book_now"
            ? bestOffer.changePercent !== null && bestOffer.changePercent < 0
                ? "Blocca subito questo hotel: la camera migliore è scesa di prezzo ed è una vera occasione."
                : "Blocca questo hotel se ti convince, perché la camera migliore a quel prezzo può sparire in fretta."
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
    if (shortlistedOffers.length === 0 || !analysis.bestOffer) {
        return buildFallbackRecommendation(analysis);
    }

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
- se il prezzo è in calo devi dirlo in modo esplicito con la percentuale
- se il prezzo è in calo e l'offerta è buona usa formule tipo "prenota ora" o "è ancora in offerta"
- se il prezzo è stabile o in aumento spiega chiaramente perché
- se lo storico è limitato, abbassa la confidenza e dichiaralo
- sii concreto, deciso e utile
- evita frasi vaghe e riassumi il motivo principale in massimo 2 frasi chiare
- in "suggestion" dai un'azione immediata e pratica
- in "bestChoiceSummary" inserisci nome hotel, costo totale e motivo sintetico della scelta
- in "travelStrategy" proponi un mini piano operativo in 1-2 frasi

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
        if (isGeminiQuotaError(error)) {
            console.warn("[HOTELS][AI] Quota Gemini esaurita: uso fallback locale della raccomandazione.");
        } else {
            console.error("Errore raccomandazione hotel con Gemini:", error);
        }
        return buildFallbackRecommendation(analysis);
    }
}
