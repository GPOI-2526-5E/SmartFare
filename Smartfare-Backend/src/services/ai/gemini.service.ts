import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../../middleware/error.middleware';
import {
    AiItineraryChatRequest,
    AiItineraryChatResponse,
    AiItineraryWorkspaceContext,
} from '../../models/ai.model';

type GeminiTextPart = {
    text?: string;
};

export class GeminiItineraryChatService {
    private readonly apiKey = process.env.GEMINI_API_KEY;
    private readonly modelName = this.resolveModelName(process.env.GEMINI_MODEL);

    private resolveModelName(rawModelName?: string): string {
        const fallbackModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
        const candidates = [
            ...(rawModelName || '')
                .split(',')
                .map((model) => model.trim())
                .filter(Boolean),
            ...fallbackModels,
        ];

        const validModel = candidates.find((model) => /^gemini-[a-z0-9.-]+$/i.test(model));
        return validModel || 'gemini-2.0-flash';
    }

    async generateChatResponse(
        userInput: AiItineraryChatRequest,
        workspace: AiItineraryWorkspaceContext
    ): Promise<AiItineraryChatResponse> {
        if (!this.apiKey) {
            throw new AppError('GEMINI_API_KEY mancante', 500);
        }

        const ai = new GoogleGenerativeAI(this.apiKey);
        const model = ai.getGenerativeModel({ model: this.modelName });

        const prompt = this.buildPrompt(userInput, workspace);

        try {
            const result = await model.generateContent(prompt);
            const responseText = this.extractText(result.response.candidates?.[0]?.content?.parts ?? []);
            return this.parseResponse(responseText);
        } catch (error: any) {
            console.error("Gemini API Error:", error);

            if (error?.status === 429 || error?.message?.includes('429')) {
                return {
                    reply: "Il sistema è temporaneamente sovraccarico (limite quota raggiunto). Riprova tra circa un minuto.",
                    suggestions: [],
                    actions: [],
                    followUpQuestions: ["Vuoi riprovare tra un istante?"],
                    needsConfirmation: false
                };
            }

            throw error;
        }
    }

    private buildPrompt(userInput: AiItineraryChatRequest, workspace: AiItineraryWorkspaceContext): string {
        const itineraryItems = (userInput.itinerary?.items || workspace.itinerary?.items || []).map((item) => ({
            d: item.dayNumber,
            o: item.orderInt,
            type: item.itemTypeCode,
            actId: item.activityId || undefined,
            accId: item.accommodationId || undefined,
            note: item.note || undefined
        }));

        const conversation = (userInput.conversation || []).slice(-10);

        const activities = (workspace.activities || []).map(a => ({ id: a.id, name: a.name, categoryId: a.category?.id }));
        const accommodations = (workspace.accommodations || []).map(acc => ({ id: acc.id, name: acc.name, stars: acc.stars }));

        return [
            'Sei l\'assistente IA di SmartFare per l\'itinerary builder.',
            'Rispondi sempre in italiano.',
            'Usa solo i POI presenti nel workspace fornito.',
            'Non inventare luoghi, hotel o attività che non esistono nel contesto.',
            'Se il messaggio dell\'utente richiede una modifica, proponi un piano chiaro e operazioni sicure.',
            'Se mancano informazioni, fai domande brevi e specifiche.',
            'Restituisci SOLO JSON valido, senza markdown, senza backticks e senza testo extra.',
            'Formato richiesto:',
            '{"reply":"string","suggestions":[{"title":"string","description":"string","type":"poi|day|food|evening|route|general"}],"actions":[{"type":"suggest|ask_clarification|add_item|remove_item|update_item|reorder_items","payload":{}}],"followUpQuestions":["string"],"needsConfirmation":true}',
            '',
            `Messaggio utente: ${userInput.message}`,
            userInput.preferences ? `Preferenze: ${JSON.stringify(userInput.preferences)}` : 'Preferenze: non fornite',
            `Contesto destinazione: ${JSON.stringify(workspace.location)}`,
            `Itinerario corrente: ${JSON.stringify(userInput.itinerary || workspace.itinerary)}`,
            `Tappe correnti: ${JSON.stringify(itineraryItems)}`,
            `Alloggi disponibili: ${JSON.stringify(accommodations)}`,
            `Attività disponibili: ${JSON.stringify(activities)}`,
            `Categorie: ${JSON.stringify(workspace.categories)}`,
            conversation.length > 0 ? `Storico conversazione: ${JSON.stringify(conversation)}` : 'Storico conversazione: vuoto',
        ].join('\n');
    }

    private extractText(parts: GeminiTextPart[]): string {
        return parts
            .map((part) => part.text || '')
            .join('\n')
            .trim();
    }

    private parseResponse(text: string): AiItineraryChatResponse {
        const parsed = this.tryParseJson(text);
        if (parsed) {
            return {
                reply: typeof parsed.reply === 'string' ? parsed.reply : text,
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
                actions: Array.isArray(parsed.actions) ? parsed.actions : [],
                followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
                needsConfirmation: Boolean(parsed.needsConfirmation),
            };
        }

        return {
            reply: text || 'Non sono riuscito a generare una risposta strutturata.',
            suggestions: [],
            actions: [],
            followUpQuestions: [],
            needsConfirmation: false,
        };
    }

    private tryParseJson(text: string): any {
        if (!text) return null;

        const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const candidate = fencedMatch?.[1] || text;

        const firstBrace = candidate.indexOf('{');
        const lastBrace = candidate.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
            return null;
        }

        const jsonSlice = candidate.slice(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(jsonSlice);
        } catch {
            return null;
        }
    }

    async identifyLocation(prompt: string, locations: { id: number, name: string }[]): Promise<number | null> {
        if (!this.apiKey) throw new AppError('GEMINI_API_KEY mancante', 500);
        const ai = new GoogleGenerativeAI(this.apiKey);
        const model = ai.getGenerativeModel({ model: this.modelName });

        const systemPrompt = [
            'Sei un esperto di viaggi.',
            'Dato un prompt dell\'utente e una lista di location (ID e Nome), identifica quale location è la più pertinente.',
            'Se non trovi una corrispondenza esatta, scegli la più vicina.',
            'Se non c\'è alcuna corrispondenza sensata, restituisci "null".',
            'Restituisci SOLO l\'ID numerico o la stringa "null".',
            '',
            `Lista location: ${JSON.stringify(locations)}`,
            `Prompt utente: "${prompt}"`
        ].join('\n');

        const result = await model.generateContent(systemPrompt);
        const text = this.extractText(result.response.candidates?.[0]?.content?.parts ?? []);
        
        if (text.toLowerCase().includes('null')) return null;
        const id = parseInt(text.replace(/[^0-9]/g, ''));
        return isNaN(id) ? null : id;
    }

    async generateInitialItinerary(prompt: string, workspace: AiItineraryWorkspaceContext): Promise<any> {
        if (!this.apiKey) throw new AppError('GEMINI_API_KEY mancante', 500);
        const ai = new GoogleGenerativeAI(this.apiKey);
        const model = ai.getGenerativeModel({ model: this.modelName });

        const activities = (workspace.activities || []).map(a => ({ id: a.id, name: a.name, category: a.category?.name }));
        const accommodations = (workspace.accommodations || []).map(acc => ({ id: acc.id, name: acc.name, stars: acc.stars }));

        const systemPrompt = [
            'Sei un assistente esperto di viaggi SmartFare.',
            `L'utente vuole organizzare un viaggio a ${workspace.location?.name}.`,
            `Richiesta specifica: "${prompt}"`,
            '',
            'Usa i POI (attività e alloggi) forniti per costruire un itinerario di 3-5 giorni.',
            'Per ogni tappa, specifica dayNumber, orderInt, itemTypeCode (ACTIVITY o ACCOMMODATION), activityId o accommodationId, note, e groupName.',
            'Il groupName serve per raggruppare le attività della giornata (es. "Mattina", "Pomeriggio", "Cena").',
            'Sii creativo ma coerente con la richiesta dell\'utente.',
            'Restituisci SOLO JSON valido.',
            '',
            'Esempio formato:',
            '{"name": "Titolo Viaggio", "items": [{"dayNumber": 1, "orderInt": 1, "itemTypeCode": "ACTIVITY", "activityId": 10, "note": "Descrizione", "groupName": "Mattina"}]}',
            '',
            `Attività disponibili: ${JSON.stringify(activities)}`,
            `Alloggi disponibili: ${JSON.stringify(accommodations)}`,
        ].join('\n');

        const result = await model.generateContent(systemPrompt);
        const responseText = this.extractText(result.response.candidates?.[0]?.content?.parts ?? []);
        return this.tryParseJson(responseText);
    }
}
