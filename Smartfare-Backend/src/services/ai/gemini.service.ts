import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../../middleware/error.middleware';
import { applyGroupLevelTiming } from '../itinerary/itinerary-item-timing.util';
import {
    AiItineraryChatRequest,
    AiItineraryChatResponse,
    AiItineraryItemSnapshot,
    AiItineraryWorkspaceContext,
} from '../../models/ai.model';

type GeminiTextPart = {
    text?: string;
};

const PROMPT_STOP_WORDS = new Set([
    'aggiungi', 'aggiungere', 'inserisci', 'metti', 'mettere', 'rimuovi', 'togli', 'elimina',
    'come', 'prima', 'tappa', 'tappe', 'giorno', 'giorni', 'percorso', 'itinerario', 'viaggio',
    'della', 'dello', 'delle', 'dei', 'degli', 'dell', 'nel', 'nella', 'nello', 'nelle', 'nei',
    'una', 'uno', 'dei', 'che', 'con', 'per', 'alla', 'alle', 'allo', 'agli', 'deve', 'essere',
    'stazione', 'stazioni', 'ferroviaria', 'ferroviario',
]);

export class GeminiItineraryChatService {
    private readonly apiKey = process.env.GEMINI_API_KEY;
    private readonly modelName = this.resolveModelName(process.env.GEMINI_MODEL);

    private resolveModelName(rawModelName?: string): string {
        const deprecatedModelMap: Record<string, string> = {
            'gemini-1.5-flash': 'gemini-2.5-flash',
            'gemini-1.5-flash-latest': 'gemini-2.5-flash',
            'gemini-1.5-pro': 'gemini-2.5-flash'
        };
        const fallbackModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
        const candidates = [
            ...(rawModelName || '')
                .split(',')
                .map((model) => deprecatedModelMap[model.trim()] || model.trim())
                .filter(Boolean),
            ...fallbackModels,
        ];

        const validModel = candidates.find((model) => /^gemini-[a-z0-9.-]+$/i.test(model));
        return validModel || 'gemini-2.0-flash';
    }

    private async sleep(ms: number) {
        return new Promise((res) => setTimeout(res, ms));
    }

    private parseRetryDelayFromError(error: any): number | null {
        try {
            const details = error?.errorDetails || error?.error_details || [];
            for (const d of details) {
                if (d['@type'] && d['@type'].includes('RetryInfo') && d.retryDelay) {
                    // retryDelay might be like '41s' or '00:00:41'
                    const rd = d.retryDelay;
                    const match = String(rd).match(/(\d+)(?:s)?$/i);
                    if (match) return parseInt(match[1], 10) * 1000;
                    const isoMatch = String(rd).match(/(\d+):(\d+):(\d+)/);
                    if (isoMatch) {
                        const h = parseInt(isoMatch[1], 10);
                        const m = parseInt(isoMatch[2], 10);
                        const s = parseInt(isoMatch[3], 10);
                        return ((h * 3600) + (m * 60) + s) * 1000;
                    }
                }
            }
        } catch (e) {
            // ignore
        }
        return null;
    }

    private parseQuotaFailureIsTokenRelated(error: any): boolean {
        try {
            const details = error?.errorDetails || error?.error_details || [];
            for (const d of details) {
                if (d['@type'] && d['@type'].includes('QuotaFailure') && Array.isArray(d.violations)) {
                    for (const v of d.violations) {
                        const metric = String(v.quotaMetric || v.quotaId || '').toLowerCase();
                        if (metric.includes('token') || metric.includes('tokens') || metric.includes('generate_content_tokens')) {
                            return true;
                        }
                        // some providers include 'generate_content_free_tier_requests' for requests, skip
                    }
                }
            }
        } catch (e) {
            // ignore
        }
        return false;
    }

    private jitterDelay(baseMs: number) {
        // Add +/- 30% jitter
        const jitter = Math.floor(baseMs * 0.3);
        const delta = Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
        return Math.max(0, baseMs + delta);
    }

    private async callGeminiWithRetry(model: any, prompt: string, retries = 3): Promise<any> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await model.generateContent(prompt);
            } catch (error: any) {
                const isNetworkError = error?.message?.includes('fetch failed') || error?.code === 'UND_ERR_CONNECT_TIMEOUT';

                // If API returns RetryInfo (rate limit), honor it
                const retryDelayMs = this.parseRetryDelayFromError(error);
                if (retryDelayMs != null) {
                    const waitMs = this.jitterDelay(retryDelayMs);
                    console.warn(`Gemini rate-limit / retry requested: waiting ${waitMs}ms before retry (attempt ${attempt + 1}/${retries + 1})`);
                    if (attempt < retries) {
                        await this.sleep(waitMs);
                        continue;
                    }
                    // no attempts left, rethrow so caller can fallback
                    throw error;
                }

                if (isNetworkError && attempt < retries) {
                    // exponential base of 800ms
                    const base = 800 * Math.pow(2, attempt);
                    const wait = this.jitterDelay(base);
                    console.log(`Gemini API network error (attempt ${attempt + 1}/${retries + 1}), retrying in ${wait}ms...`);
                    await this.sleep(wait);
                    continue;
                }

                // For 429 without RetryInfo, do a short backoff if attempts remain
                if ((error?.status === 429 || String(error?.message || '').includes('429')) && attempt < retries) {
                    const base = 1500 * Math.pow(2, attempt);
                    const wait = this.jitterDelay(base);
                    console.warn(`Gemini returned 429 (attempt ${attempt + 1}/${retries + 1}), retrying in ${wait}ms...`);
                    await this.sleep(wait);
                    continue;
                }

                throw error;
            }
        }
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
            const result = await this.callGeminiWithRetry(model, prompt);
            const responseText = this.extractText(result.response.candidates?.[0]?.content?.parts ?? []);
            return this.parseResponse(responseText);
        } catch (error: any) {
            console.error("Gemini API Error:", error);
            // If the error indicates token-quota exhaustion, give a clear message including wait time
            if (this.parseQuotaFailureIsTokenRelated(error)) {
                const retryMs = this.parseRetryDelayFromError(error);
                const waitSeconds = retryMs ? Math.ceil(retryMs / 1000) : 60;
                return {
                    reply: `IA in sovraccarico (token esauriti). Riprova tra circa ${waitSeconds} secondi.`,
                    suggestions: [],
                    actions: [],
                    followUpQuestions: ["Vuoi riprovare tra un istante?"],
                    needsConfirmation: false
                };
            }

            if (error?.status === 429 || error?.message?.includes('429')) {
                const retryMs = this.parseRetryDelayFromError(error);
                const waitSeconds = retryMs ? Math.ceil(retryMs / 1000) : 60;
                return {
                    reply: `Il sistema è temporaneamente sovraccarico (limite quota raggiunto). Riprova tra circa ${waitSeconds} secondi.`,
                    suggestions: [],
                    actions: [],
                    followUpQuestions: ["Vuoi riprovare tra un istante?"],
                    needsConfirmation: false
                };
            }

            throw error;
        }
    }

    async generateItineraryEditResponse(
        userInput: AiItineraryChatRequest,
        workspace: AiItineraryWorkspaceContext
    ): Promise<AiItineraryChatResponse> {
        if (!this.apiKey) {
            throw new AppError('GEMINI_API_KEY mancante', 500);
        }

        const ai = new GoogleGenerativeAI(this.apiKey);
        const model = ai.getGenerativeModel({ model: this.modelName });
        const currentItinerary = userInput.itinerary || workspace.itinerary || null;
        const directEdit = this.tryDirectItineraryEdit(userInput.message, currentItinerary, workspace);
        if (directEdit) {
            return directEdit;
        }

        const prompt = this.buildEditPrompt(userInput, workspace);

        try {
            const result = await this.callGeminiWithRetry(model, prompt);
            const responseText = this.extractText(result.response.candidates?.[0]?.content?.parts ?? []);
            const parsed = this.parseResponse(responseText);
            const rawItinerary = parsed.itinerary || this.tryParseItinerary(responseText);
            const normalized = rawItinerary
                ? this.normalizeEditedItinerary(rawItinerary, currentItinerary, workspace)
                : null;
            const itineraryChanged = normalized && this.itineraryChanged(currentItinerary, normalized);

            return {
                ...parsed,
                reply: itineraryChanged
                    ? parsed.reply
                    : (parsed.reply || 'Non ho potuto applicare la modifica. Prova a essere più specifico, ad esempio: "Aggiungi il museo al giorno 2" o "Rimuovi la cena del primo giorno".'),
                needsConfirmation: itineraryChanged ? Boolean(parsed.needsConfirmation) : false,
                itinerary: itineraryChanged ? normalized : null,
            };
        } catch (error: any) {
            console.error('Gemini itinerary edit Error:', error);
            if (this.parseQuotaFailureIsTokenRelated(error)) {
                const retryMs = this.parseRetryDelayFromError(error);
                const waitSeconds = retryMs ? Math.ceil(retryMs / 1000) : 60;
                return {
                    reply: `IA in sovraccarico (token esauriti). Riprova tra circa ${waitSeconds} secondi.`,
                    suggestions: [],
                    actions: [],
                    followUpQuestions: [],
                    needsConfirmation: false,
                    itinerary: userInput.itinerary || workspace.itinerary || null
                };
            }

            return {
                reply: 'In questo momento i servizi di Smartfare AI sono in sovraccarico. Riprova tra un istante.',
                suggestions: [],
                actions: [],
                followUpQuestions: [],
                needsConfirmation: false,
                itinerary: userInput.itinerary || workspace.itinerary || null
            };
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

        const conversation = (userInput.conversation || []).slice(-5); // Reduced history

        // Limit the number of POIs to reduce token usage
        const activities = (workspace.activities || [])
            .slice(0, 40)
            .map(a => ({ id: a.id, name: a.name, categoryId: a.category?.id }));
        const accommodations = (workspace.accommodations || [])
            .slice(0, 20)
            .map(acc => ({ id: acc.id, name: acc.name, stars: acc.stars }));

        return [
            'Sei l\'assistente IA di SmartFare per l\'itinerary builder.',
            'Rispondi sempre in italiano.',
            'Usa solo i POI presenti nel workspace fornito.',
            'Non inventare luoghi, hotel o attività che non esistono nel contesto.',
            'Se il messaggio dell\'utente richiede una modifica, proponi un piano chiaro e operazioni sicure.',
            'Quando suggerisci attività con libertà creativa, rispetta le preferenze salvate; richieste esplicite nel messaggio corrente hanno priorità.',
            'Quando possibile, restituisci suggerimenti come card operative: usa titoli brevi, descrizioni concise e, se puoi, collega la card a un POI reale con poiId e poiType.',
            'Se l\'utente chiede modifiche pratiche, usa azioni come add_day, create_nostalgic_day, reorder_route, optimize_route, add_stop, remove_stop o focus_poi.',
            'Se mancano informazioni, fai domande brevi e specifiche.',
            'Restituisci SOLO JSON valido, senza markdown, senza backticks e senza testo extra.',
            'Formato richiesto:',
            '{"reply":"string","suggestions":[{"title":"string","description":"string","type":"poi|day|food|evening|route|general","poiId":123,"poiType":"activity"}],"actions":[{"type":"suggest|ask_clarification|add_item|remove_item|update_item|reorder_items|add_day|create_nostalgic_day|reorder_route|optimize_route|add_stop|remove_stop|focus_poi|generate_itinerary","payload":{}}],"followUpQuestions":["string"],"needsConfirmation":true}',
            '',
            `Messaggio utente: ${userInput.message}`,
            workspace.userPreferencePrompt || 'Preferenze salvate: non disponibili (utente ospite o profilo vuoto)',
            userInput.preferences ? `Preferenze aggiuntive dal client: ${JSON.stringify(userInput.preferences)}` : '',
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
                itinerary: parsed.itinerary || null,
            };
        }

        return {
            reply: text || 'In questo momento i servizi di Smartfare AI sono in sovraccarico. Riprova tra un istante.',
            suggestions: [],
            actions: [],
            followUpQuestions: [],
            needsConfirmation: false,
            itinerary: null,
        };
    }

    private buildEditPrompt(userInput: AiItineraryChatRequest, workspace: AiItineraryWorkspaceContext): string {
        const currentItinerary = userInput.itinerary || workspace.itinerary;
        const conversation = (userInput.conversation || []).slice(-6);

        const messageMatches = this.findMatchingActivitiesForMessage(userInput.message, workspace.activities || []);
        const activities = this.buildActivitiesForPrompt(userInput.message, workspace.activities || []);
        const accommodations = (workspace.accommodations || [])
            .slice(0, 20)
            .map(acc => ({ id: acc.id, name: acc.name, stars: acc.stars }));

        return [
            'Sei l’editor AI del builder itinerari di SmartFare.',
            'L’utente sta già guardando un itinerario e vuole modificarlo in tempo reale.',
            'REGOLE OPERATIVE:',
            '1. Se la richiesta è un’operazione concreta (aggiungi, rimuovi, sposta, sostituisci, ottimizza, aggiungi giorno), APPLICA subito la modifica nell’itinerary e spiega in reply cosa hai fatto in 1-2 frasi dirette (es. "Ho aggiunto Genova Piazza Principe come prima tappa del giorno 1").',
            '2. Il catalogo POI include TUTTE le categorie: stazioni, musei, ristoranti, monumenti, parchi, bar, ecc. Non dire che un luogo non esiste se compare in "POI corrispondenti alla richiesta" o nella lista POI.',
            '3. Non rispondere in modo vago. Se il POI è nella lista, usalo con il suo activityId.',
            '4. Chiedi chiarimento SOLO se ci sono più POI plausibili e la richiesta non permette di scegliere. Altrimenti applica la modifica.',
            '5. Usa solo activityId e accommodationId presenti nelle liste. Non inventare POI.',
            '6. Mantieni il massimo possibile delle tappe esistenti; modifica solo ciò che serve.',
            '7. Esempi di richieste da eseguire subito: "ottimizza il viaggio", "aggiungi un giorno 2 con monumenti", "metti un bar in mezzo", "crea un percorso semplice e tranquillo", "rimuovi la tappa X", "sposta il pranzo alle 13:30".',
            '8. Per "percorso tranquillo/semplice" riduci tappe fitte, aumenta pause e POI panoramici; per "ottimizza" riordina minimizzando spostamenti nel catalogo.',
            '9. Se l’utente chiede un giorno aggiuntivo, incrementa dayNumber e popola quel giorno con POI coerenti dal catalogo (monumenti, cultura, food, ecc.).',
            '10. Quando proponi o generi tappe senza richiesta esplicita nel messaggio, rispetta le preferenze salvate. Se il messaggio è esplicito (es. discoteca stasera), segui il messaggio anche se contrasta con le note.',
            'Restituisci SOLO JSON valido con i campi reply, suggestions, actions, followUpQuestions, needsConfirmation e itinerary.',
            'L’itinerary deve essere SEMPRE l’itinerario completo aggiornato (tutti i giorni e tutte le tappe), non un diff parziale.',
            'Conserva gli id numerici delle tappe esistenti quando non le modifichi.',
            'Per ogni tappa usa: dayNumber, orderInt, itemTypeCode (ACTIVITY o ACCOMMODATION), activityId o accommodationId, groupName, timeSlotStart, timeSlotEnd (HH:mm).',
            'Se groupName è valorizzato, timeSlotStart/timeSlotEnd si riferiscono al GRUPPO (non alla singola attività): tutte le attività dello stesso groupName nello stesso giorno condividono lo stesso slot.',
            'Formato JSON richiesto:',
            '{"reply":"Ho spostato la colazione al giorno 2 alle 09:00.","suggestions":[],"actions":[],"followUpQuestions":[],"needsConfirmation":false,"itinerary":{"name":"Titolo","description":"Desc","items":[{"id":1,"dayNumber":1,"orderInt":1,"itemTypeCode":"ACTIVITY","activityId":123,"groupName":"Mattina","timeSlotStart":"10:00","timeSlotEnd":"11:00"}]}}',
            '',
            `Messaggio utente: ${userInput.message}`,
            workspace.userPreferencePrompt || 'Preferenze salvate: non disponibili (utente ospite o profilo vuoto)',
            userInput.preferences ? `Preferenze aggiuntive dal client: ${JSON.stringify(userInput.preferences)}` : '',
            `Location: ${JSON.stringify(workspace.location)}`,
            `Itinerario corrente: ${JSON.stringify(currentItinerary)}`,
            messageMatches.length > 0
                ? `POI corrispondenti alla richiesta (PRIORITÀ — usa questi activityId): ${JSON.stringify(messageMatches)}`
                : 'POI corrispondenti alla richiesta: nessun match testuale automatico; cerca nel catalogo POI.',
            `Alloggi disponibili: ${JSON.stringify(accommodations)}`,
            `Catalogo POI disponibili (attività, stazioni, ristoranti, ecc.): ${JSON.stringify(activities)}`,
            `Categorie: ${JSON.stringify(workspace.categories)}`,
            conversation.length > 0 ? `Storico conversazione: ${JSON.stringify(conversation)}` : 'Storico conversazione: vuoto'
        ].join('\n');
    }

    private tryParseItinerary(text: string): AiItineraryWorkspaceContext['itinerary'] | null {
        const parsed = this.tryParseJson(text);
        if (!parsed || !parsed.itinerary) return null;
        return parsed.itinerary;
    }

    private normalizeEditedItinerary(
        raw: NonNullable<AiItineraryWorkspaceContext['itinerary']>,
        current: AiItineraryWorkspaceContext['itinerary'] | null,
        workspace: AiItineraryWorkspaceContext
    ): NonNullable<AiItineraryWorkspaceContext['itinerary']> {
        const activityIds = new Set((workspace.activities || []).map((activity) => activity.id));
        const accommodationIds = new Set((workspace.accommodations || []).map((acc) => acc.id));
        const startDate = raw.startDate || current?.startDate || new Date().toISOString().split('T')[0];
        const currentItems = current?.items || [];

        const items = (raw.items || [])
            .map((item: any, index: number) => {
                const dayNumber = Number(item.dayNumber || 1);
                const dateStr = this.resolveItemDate(item, startDate, dayNumber);
                const existing = this.findMatchingItem(item, currentItems);

                return {
                    id: existing?.id ?? item.id,
                    dayNumber,
                    orderInt: Number(item.orderInt || index + 1),
                    itemTypeCode: item.itemTypeCode,
                    activityId: item.activityId ?? undefined,
                    accommodationId: item.accommodationId ?? undefined,
                    note: item.note ?? undefined,
                    groupName: item.groupName ?? undefined,
                    plannedStartAt: this.resolvePlannedDateTime(dateStr, dayNumber, item.timeSlotStart || item.plannedStartAt),
                    plannedEndAt: this.resolvePlannedDateTime(dateStr, dayNumber, item.timeSlotEnd || item.plannedEndAt),
                };
            })
            .filter((item) => item.itemTypeCode === 'ACTIVITY' || item.itemTypeCode === 'ACCOMMODATION')
            .filter((item) => {
                if (item.itemTypeCode === 'ACTIVITY') {
                    return Boolean(item.activityId && activityIds.has(item.activityId));
                }
                return Boolean(item.accommodationId && accommodationIds.has(item.accommodationId));
            })
            .sort((left, right) => {
                if (left.dayNumber !== right.dayNumber) return left.dayNumber - right.dayNumber;
                return (left.orderInt || 0) - (right.orderInt || 0);
            });

        const itemsWithGroupTiming = applyGroupLevelTiming(items);

        const maxDay = itemsWithGroupTiming.reduce((max, item) => Math.max(max, item.dayNumber), 1);
        const endDate = raw.endDate || current?.endDate || this.addDaysToDate(startDate, maxDay - 1);

        return {
            id: current?.id ?? raw.id,
            name: raw.name || current?.name || 'Itinerario',
            startDate,
            endDate,
            locationId: current?.locationId ?? workspace.location?.id ?? raw.locationId ?? null,
            items: itemsWithGroupTiming.length > 0 ? itemsWithGroupTiming : currentItems,
        };
    }

    private findMatchingItem(
        item: { id?: number; dayNumber?: number; activityId?: number | null; accommodationId?: number | null; itemTypeCode?: string },
        currentItems: NonNullable<AiItineraryWorkspaceContext['itinerary']>['items']
    ) {
        if (!currentItems?.length) return null;
        if (item.id) {
            const byId = currentItems.find((entry) => entry.id === item.id);
            if (byId) return byId;
        }
        return currentItems.find((entry) =>
            entry.dayNumber === Number(item.dayNumber || 1) &&
            entry.itemTypeCode === item.itemTypeCode &&
            (item.itemTypeCode === 'ACTIVITY'
                ? entry.activityId === item.activityId
                : entry.accommodationId === item.accommodationId)
        ) || null;
    }

    private resolveItemDate(item: { date?: string }, startDate: string, dayNumber: number): string {
        if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
            return item.date;
        }
        return this.addDaysToDate(startDate, Math.max(0, dayNumber - 1));
    }

    private addDaysToDate(startDate: string, daysToAdd: number): string {
        const base = new Date(startDate);
        base.setDate(base.getDate() + daysToAdd);
        return base.toISOString().split('T')[0];
    }

    private resolvePlannedDateTime(startDate: string, dayNumber: number, value?: string | null) {
        if (!value) return undefined;

        const timeMatch = String(value).match(/(\d{2}):(\d{2})/);
        if (!timeMatch) {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
        }

        const base = new Date(startDate);
        base.setDate(base.getDate() + Math.max(0, dayNumber - 1));
        base.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
        return base.toISOString();
    }

    private itineraryChanged(
        before: AiItineraryWorkspaceContext['itinerary'] | null,
        after: NonNullable<AiItineraryWorkspaceContext['itinerary']>
    ): boolean {
        return this.serializeItineraryItems(before?.items) !== this.serializeItineraryItems(after.items);
    }

    private serializeItineraryItems(items?: AiItineraryItemSnapshot[] | null) {
        const normalized = (items || [])
            .map((item) => ({
                dayNumber: item.dayNumber,
                orderInt: item.orderInt,
                itemTypeCode: item.itemTypeCode,
                activityId: item.activityId ?? null,
                accommodationId: item.accommodationId ?? null,
                groupName: item.groupName ?? null,
                note: item.note ?? null,
                plannedStartAt: item.plannedStartAt ?? null,
                plannedEndAt: item.plannedEndAt ?? null,
                groupStartAt: item.groupStartAt ?? null,
                groupEndAt: item.groupEndAt ?? null,
            }))
            .sort((left, right) => {
                if (left.dayNumber !== right.dayNumber) return left.dayNumber - right.dayNumber;
                return (left.orderInt || 0) - (right.orderInt || 0);
            });

        return JSON.stringify(normalized);
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

        const normalizeText = (value: string) =>
            value
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

        // --- FALLBACK: Local Matching ---
        const promptLower = prompt.toLowerCase();
        const normalizedPrompt = normalizeText(prompt);
        for (const loc of locations) {
            const locNameLower = loc.name.toLowerCase();
            const regex = new RegExp(`\\b${locNameLower}\\b`, 'i');
            if (regex.test(promptLower)) {
                return loc.id;
            }

            const normalizedLocation = normalizeText(loc.name);
            if (
                normalizedPrompt === normalizedLocation ||
                normalizedPrompt.includes(normalizedLocation) ||
                normalizedLocation.includes(normalizedPrompt)
            ) {
                return loc.id;
            }
        }

        const ai = new GoogleGenerativeAI(this.apiKey);
        const model = ai.getGenerativeModel({ model: this.modelName });

        const systemPrompt = [
            'Sei un esperto di viaggi.',
            'Dato un prompt dell\'utente e una lista di nomi di location, identifica quale location è la più pertinente.',
            'Se non trovi una corrispondenza esatta, scegli la più vicina.',
            'Se non c\'è alcuna corrispondenza sensata, restituisci "null".',
            'Restituisci SOLO il NOME della location identificata o la stringa "null".',
            '',
            `Lista location: ${locations.map(l => l.name).join(', ')}`,
            `Prompt utente: "${prompt}"`
        ].join('\n');

        try {
            const result = await this.callGeminiWithRetry(model, systemPrompt);
            const text = this.extractText(result.response.candidates?.[0]?.content?.parts ?? []);

            if (text.toLowerCase().includes('null')) return null;

            const identifiedName = text.trim().toLowerCase();
            const normalizedIdentified = normalizeText(identifiedName);
            const found = locations.find((l) => {
                const normalizedLocation = normalizeText(l.name);
                return (
                    l.name.toLowerCase() === identifiedName ||
                    identifiedName.includes(l.name.toLowerCase()) ||
                    normalizedIdentified === normalizedLocation ||
                    normalizedIdentified.includes(normalizedLocation) ||
                    normalizedLocation.includes(normalizedIdentified)
                );
            });
            return found ? found.id : null;
        } catch (error: any) {
            console.error("Gemini identifyLocation Error:", error);
            const broadMatch = locations.find((l) => {
                const normalizedLocation = normalizeText(l.name);
                return promptLower.includes(l.name.toLowerCase()) || normalizedPrompt.includes(normalizedLocation);
            });
            if (broadMatch) return broadMatch.id;
            return null;
        }
    }

    async generateInitialItinerary(prompt: string, workspace: AiItineraryWorkspaceContext): Promise<any> {
        if (!this.apiKey) throw new AppError('GEMINI_API_KEY mancante', 500);
        const ai = new GoogleGenerativeAI(this.apiKey);
        const model = ai.getGenerativeModel({ model: this.modelName });

        const rankedActivities = this.rankActivitiesForPrompt(prompt, workspace.activities || []);
        const activities = rankedActivities
            .slice(0, 80)
            .map(a => ({ id: a.id, name: a.name, category: a.category?.name }));
        const accommodations = (workspace.accommodations || [])
            .slice(0, 20)
            .map(acc => ({ id: acc.id, name: acc.name, stars: acc.stars }));

        const highlightedActivities = rankedActivities
            .slice(0, 20)
            .map(a => `${a.name} [${a.category?.name || 'senza categoria'}] (#${a.id})`);

        const foodActivities = rankedActivities
            .filter((activity) => ['Ristoranti', 'Caffe', 'Panetterie', 'Bar', 'Enoteche', 'Gelaterie'].includes(activity.category?.name || ''))
            .slice(0, 20)
            .map(a => `${a.name} [${a.category?.name}] (#${a.id})`);

        const cultureActivities = rankedActivities
            .filter((activity) => ['Musei', 'Monumenti', 'Landmark', 'Chiese', 'Castelli', 'Punti panoramici'].includes(activity.category?.name || '') || activity.name.toLowerCase().includes('acquario'))
            .slice(0, 25)
            .map(a => `${a.name} [${a.category?.name || 'senza categoria'}] (#${a.id})`);

        const systemPrompt = [
            'Sei un assistente esperto di viaggi SmartFare.',
            `L'utente vuole organizzare un viaggio a ${workspace.location?.name}.`,
            `Richiesta specifica: "${prompt}"`,
            '',
            'ISTRUZIONI CRITICHE:',
            '1. RAGGRUPPAMENTO: groupName DEVE raggruppare MULTIPLE attività della stessa categoria in UN UNICO slot temporale.',
            '   Sbagliato: "25mq Café" da solo. Corretto: "Ristoranti & Pausa" con colazione, pranzo, cena insieme.',
            '2. ALLOGGI: Usa 1 SOLO alloggio per intero viaggio (dayNumber=1). Solo se necessario, aggiungi 1-2 aggiuntivi a fine viaggio.',
            '   Sbagliato: 1 alloggio per giorno.',
            '3. DATE: Ogni item DEVE avere campo "date" (YYYY-MM-DD) calcolato dal primo giorno di viaggio.',
            '',
            'Usa i POI (attività e alloggi) forniti per costruire un itinerario di 3-5 giorni.',
            'Puoi usare SOLO activityId e accommodationId realmente presenti nelle liste qui sotto.',
            'Non riutilizzare ID di esempio, non inventare ID, non usare placeholder.',
            'L’itinerario deve essere ricco, concreto e ben distribuito.',
            'Ogni giorno deve includere una struttura completa con momenti come colazione, una visita o esperienza forte al mattino, pranzo, esperienza pomeridiana e cena quando il catalogo lo consente.',
            'Se l’utente ha chiesto esplicitamente luoghi come Acquario, musei o monumenti, questi elementi devono essere presenti davvero nell’output se esistono nelle liste disponibili.',
            'Quando compili l’itinerario con libertà creativa, rispetta le preferenze salvate sotto. Richieste esplicite nel prompt utente hanno priorità sulle note e preferenze.',
            workspace.userPreferencePrompt || '',
            'Non creare giornate vuote o con una sola attività, salvo impossibilità assoluta del catalogo.',
            'Per ogni tappa, specifica dayNumber, orderInt, date (YYYY-MM-DD), itemTypeCode (ACTIVITY o ACCOMMODATION), activityId o accommodationId, note, groupName, timeSlotStart e timeSlotEnd.',
            'Usa timeSlotStart e timeSlotEnd nel formato HH:mm. Se più attività condividono lo stesso groupName nello stesso giorno, usa gli STESSI orari per tutte (slot di gruppo).',
            'Restituisci anche una description narrativa sintetica dell’itinerario.',
            'Il groupName serve per raggruppare le attività della giornata (es. "Mattina", "Pomeriggio", "Cena").',
            '{"name":"Titolo","description":"Desc","items":[{"dayNumber":1,"date":"2026-05-16","orderInt":1,"itemTypeCode":"ACCOMMODATION","accommodationId":123,"groupName":"Arrivo & Check-in","timeSlotStart":"14:00","timeSlotEnd":"16:00"},{"dayNumber":1,"date":"2026-05-16","orderInt":2,"itemTypeCode":"ACTIVITY","activityId":124,"groupName":"Ristoranti & Pausa","timeSlotStart":"18:00","timeSlotEnd":"21:00"}]}',
            '',
            `Attività prioritarie e più rilevanti: ${JSON.stringify(highlightedActivities)}`,
            `Attività culturali / must-see: ${JSON.stringify(cultureActivities)}`,
            `Attività food / pause: ${JSON.stringify(foodActivities)}`,
            `Attività disponibili: ${JSON.stringify(activities)}`,
            `Alloggi disponibili: ${JSON.stringify(accommodations)}`,
        ].join('\n');

        try {
            const result = await this.callGeminiWithRetry(model, systemPrompt);
            const responseText = this.extractText(result.response.candidates?.[0]?.content?.parts ?? []);
            return this.tryParseJson(responseText);
        } catch (error: any) {
            console.error("Gemini generateInitialItinerary Error:", error);
            return null;
        }
    }

    private buildActivitiesForPrompt(
        message: string,
        activities: AiItineraryWorkspaceContext['activities']
    ) {
        const matchedSummaries = this.findMatchingActivitiesForMessage(message, activities);
        const matchedIds = new Set(matchedSummaries.map((entry) => entry.id));
        const matchedActivities = matchedSummaries
            .map((entry) => activities.find((activity) => activity.id === entry.id))
            .filter((activity): activity is AiItineraryWorkspaceContext['activities'][number] => Boolean(activity));
        const ranked = this.rankActivitiesForPrompt(message, activities);
        const merged = [
            ...matchedActivities,
            ...ranked.filter((activity) => !matchedIds.has(activity.id)),
        ].slice(0, 80);

        return merged.map((activity) => ({
            id: activity.id,
            name: activity.name,
            category: activity.category?.name,
        }));
    }

    private findMatchingActivitiesForMessage(
        message: string,
        activities: AiItineraryWorkspaceContext['activities']
    ) {
        const lowerMessage = message.toLowerCase();
        const tokens = this.extractPromptTokens(lowerMessage);

        return activities
            .map((activity) => ({
                activity,
                score: this.scoreActivityMatch(activity, lowerMessage, tokens),
            }))
            .filter((entry) => entry.score >= 70)
            .sort((left, right) => right.score - left.score)
            .slice(0, 8)
            .map((entry) => ({
                id: entry.activity.id,
                name: entry.activity.name,
                category: entry.activity.category?.name,
                matchScore: entry.score,
            }));
    }

    private extractPromptTokens(message: string): string[] {
        return message
            .split(/[^a-zàèéìòù0-9]+/i)
            .map((token) => token.trim())
            .filter((token) => token.length >= 3 && !PROMPT_STOP_WORDS.has(token));
    }

    private scoreActivityMatch(
        activity: AiItineraryWorkspaceContext['activities'][number],
        lowerMessage: string,
        tokens: string[]
    ): number {
        let score = 0;
        const name = activity.name.toLowerCase();
        const category = activity.category?.name?.toLowerCase() || '';

        if (lowerMessage.length >= 5 && name.includes(lowerMessage)) {
            score += 320;
        }

        for (const token of tokens) {
            if (name.includes(token)) score += 95;
            if (category.includes(token)) score += 55;
        }

        if (/stazion|ferroviar|binari|treno/.test(lowerMessage)) {
            if (category.includes('stazion') || name.includes('stazion') || name.includes('piazza')) {
                score += 140;
            }
        }

        if (tokens.some((token) => name.includes(token)) && category.includes('stazion')) {
            score += 100;
        }

        return score;
    }

    private tryDirectItineraryEdit(
        message: string,
        currentItinerary: AiItineraryWorkspaceContext['itinerary'] | null,
        workspace: AiItineraryWorkspaceContext
    ): AiItineraryChatResponse | null {
        if (!currentItinerary?.items?.length) return null;

        const lowerMessage = message.toLowerCase();
        const matches = this.findMatchingActivitiesForMessage(message, workspace.activities || []);
        if (matches.length === 0) return null;

        const top = matches[0];
        const second = matches[1];
        if (second && top.matchScore - second.matchScore < 25) {
            return null;
        }

        const activity = workspace.activities.find((entry) => entry.id === top.id);
        if (!activity) return null;

        if (this.isAddAsFirstStopIntent(lowerMessage)) {
            const updated = this.insertActivityAsFirstStop(currentItinerary, activity);
            const normalized = this.normalizeEditedItinerary(updated, currentItinerary, workspace);
            if (!this.itineraryChanged(currentItinerary, normalized)) return null;

            return {
                reply: `Ho aggiunto ${activity.name} come prima tappa del giorno 1.`,
                suggestions: [{
                    title: activity.name,
                    description: activity.category?.name || 'Tappa',
                    type: 'poi',
                    poiId: activity.id,
                    poiType: 'activity',
                }],
                actions: [{ type: 'focus_poi', payload: { poiId: activity.id, poiType: 'activity' } }],
                followUpQuestions: [],
                needsConfirmation: false,
                itinerary: normalized,
            };
        }

        if (this.isRemoveIntent(lowerMessage)) {
            const updated = this.removeActivityFromItinerary(currentItinerary, activity.id);
            const normalized = this.normalizeEditedItinerary(updated, currentItinerary, workspace);
            if (!this.itineraryChanged(currentItinerary, normalized)) return null;

            return {
                reply: `Ho rimosso ${activity.name} dall'itinerario.`,
                suggestions: [],
                actions: [],
                followUpQuestions: [],
                needsConfirmation: false,
                itinerary: normalized,
            };
        }

        return null;
    }

    private isAddAsFirstStopIntent(message: string): boolean {
        return /(aggiung|inserisc|mett|includ)/.test(message) &&
            /(prima tappa|primo|inizio|all'inizio|come prima)/.test(message);
    }

    private isRemoveIntent(message: string): boolean {
        return /(rimuov|togl|elimin|cancel)/.test(message);
    }

    private insertActivityAsFirstStop(
        itinerary: NonNullable<AiItineraryWorkspaceContext['itinerary']>,
        activity: AiItineraryWorkspaceContext['activities'][number]
    ): NonNullable<AiItineraryWorkspaceContext['itinerary']> {
        const startDate = itinerary.startDate || new Date().toISOString().split('T')[0];
        const withoutDuplicate = (itinerary.items || []).filter((item) => item.activityId !== activity.id);
        const dayOneItems = withoutDuplicate
            .filter((item) => item.dayNumber === 1)
            .map((item) => ({ ...item, orderInt: (item.orderInt || 1) + 1 }));
        const otherItems = withoutDuplicate.filter((item) => item.dayNumber !== 1);

        const newItem = {
            dayNumber: 1,
            orderInt: 1,
            itemTypeCode: 'ACTIVITY' as const,
            activityId: activity.id,
            groupName: activity.category?.name || 'Arrivo',
            note: activity.name,
            plannedStartAt: this.resolvePlannedDateTime(startDate, 1, '09:00'),
            plannedEndAt: this.resolvePlannedDateTime(startDate, 1, '10:00'),
        };

        return {
            ...itinerary,
            items: [newItem, ...dayOneItems, ...otherItems],
        };
    }

    private removeActivityFromItinerary(
        itinerary: NonNullable<AiItineraryWorkspaceContext['itinerary']>,
        activityId: number
    ): NonNullable<AiItineraryWorkspaceContext['itinerary']> {
        return {
            ...itinerary,
            items: (itinerary.items || []).filter((item) => item.activityId !== activityId),
        };
    }

    private rankActivitiesForPrompt(prompt: string, activities: AiItineraryWorkspaceContext['activities']) {
        const lowerPrompt = prompt.toLowerCase();
        const tokens = this.extractPromptTokens(lowerPrompt);

        return [...activities].sort((left, right) => {
            return this.scoreActivityForPrompt(right, lowerPrompt, tokens) - this.scoreActivityForPrompt(left, lowerPrompt, tokens);
        });
    }

    private scoreActivityForPrompt(
        activity: AiItineraryWorkspaceContext['activities'][number],
        prompt: string,
        tokens: string[] = []
    ): number {
        let score = this.scoreActivityMatch(activity, prompt, tokens);
        const name = activity.name.toLowerCase();
        const category = activity.category?.name?.toLowerCase() || '';

        if (name.includes('acquario')) score += 120;
        if (prompt.includes('acquario') && name.includes('acquario')) score += 200;
        if (prompt.includes('muse') && (category.includes('muse') || name.includes('muse'))) score += 120;
        if (prompt.includes('monument') && (category.includes('monument') || category.includes('landmark') || name.includes('monument'))) score += 100;
        if (prompt.includes('autentic') && ['mercati', 'artigianato locale', 'chiese', 'landmark'].includes(category)) score += 70;
        if (prompt.includes('rilassat') && ['parchi', 'punti panoramici', 'caffe', 'ristoranti'].includes(category)) score += 55;

        const isCoffeeQuery = prompt.match(/caffe|caffè|colazione|bar|cappuccino|pausa/i);
        if (isCoffeeQuery && (category.includes('caffe') || category.includes('bar') || category.includes('panetteri') || name.includes('caffe') || name.includes('caffè') || name.includes('bar'))) {
            score += 150;
        }

        const isFoodQuery = prompt.match(/ristorant|pranzo|cena|mangiare|cibo|food/i);
        if (isFoodQuery && (category.includes('ristorant') || category.includes('trattori') || category.includes('osteri') || category.includes('pizzeri') || category.includes('street food'))) {
            score += 150;
        }

        if (['musei', 'monumenti', 'landmark', 'chiese', 'castelli', 'punti panoramici'].includes(category)) score += 60;
        if (['ristoranti', 'caffe', 'panetterie', 'bar', 'enoteche', 'gelaterie'].includes(category)) score += 45;
        if (['mercati', 'artigianato locale'].includes(category)) score += 35;
        if (['stazioni'].includes(category)) score += 25;
        if (['fermate bus', 'parcheggi', 'farmacie', 'benzinai'].includes(category)) score -= 80;

        return score;
    }
}
