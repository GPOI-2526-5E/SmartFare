import { AIRecommendation } from "../../models/api-response";
import { generateWithFallback } from "./gemini-models.service";
import { calculateOfferScore } from "./searching/search-utils.service";

export async function getRecommendations(offers: any[], userPreferences?: any): Promise<AIRecommendation> {
    const prompt = `Sei un esperto consulente di viaggi in treno. Analizza queste offerte e fornisci una raccomandazione:
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
        const response = await generateWithFallback(prompt);
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Risposta non valida da Gemini");
        }

        const recommendation: AIRecommendation = JSON.parse(jsonMatch[0]);
        return recommendation;
    } catch (error) {
        console.error("Errore raccomandazione con Gemini:", error);

        const sortedOffers = [...offers].sort((a, b) => {
            const scoreA = calculateOfferScore(a);
            const scoreB = calculateOfferScore(b);
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
