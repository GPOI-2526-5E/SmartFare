import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { GeminiItineraryChatService } from './gemini.service';
import { ChatMode, ChatStreamResponse, PlannerState, VoyagerChatMode } from '../../models/chat.model';
import { ItineraryService } from '../itinerary/itinerary.service';
import { applyGroupLevelTiming } from '../itinerary/itinerary-item-timing.util';
import {
  buildUserPreferencePromptBlock,
  loadUserPreferenceForAi,
  type UserPreferenceForAi,
} from '../../utils/user-preference.util';
import {
  assistantDeclaresItineraryReady,
  canGenerateItineraryFromSession,
  enrichPlannerStateDefaults,
  getMissingPlannerFields,
  isPlannerStructurallyReady,
  normalizePlannerAssistantReply,
  resolveReadyToGenerate,
} from '../../utils/planner-ready.util';

type DbMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

type UserProfileContext = UserPreferenceForAi;

type SessionWithMessages = Awaited<ReturnType<ChatService['getSessionOrThrow']>>;

const DEFAULT_TITLE = 'Nuova conversazione';

type ChatHintSuggestion = {
  title: string;
  description?: string;
  type: 'poi' | 'day' | 'food' | 'evening' | 'route' | 'general';
  poiId?: number | null;
  poiType?: 'activity' | 'accommodation' | null;
};

type ChatHintAction = {
  type:
  | 'add_day'
  | 'create_nostalgic_day'
  | 'reorder_route'
  | 'optimize_route'
  | 'add_stop'
  | 'remove_stop'
  | 'focus_poi'
  | 'generate_itinerary';
  label: string;
  payload?: Record<string, unknown>;
};

export class ChatService {
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly modelName = this.resolveModelName(process.env.GEMINI_MODEL);
  private readonly modelFallbacks = this.getModelFallbacks(process.env.GEMINI_MODEL);
  private readonly geminiPlannerService = new GeminiItineraryChatService();
  private readonly itineraryService = new ItineraryService();

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
      ...fallbackModels
    ];

    const validModel = candidates.find((model) => /^gemini-[a-z0-9.-]+$/i.test(model));
    return validModel || 'gemini-2.0-flash';
  }

  private getModelFallbacks(rawModelName?: string): string[] {
    const primary = this.resolveModelName(rawModelName);
    const fallbackModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    return [primary, ...fallbackModels].filter((model, index, array) => array.indexOf(model) === index);
  }

  private isVoyagerMode(mode: string | ChatMode): mode is VoyagerChatMode {
    return mode === 'planner' || mode === 'assistant';
  }

  async streamChatResponse(
    userId: number,
    chatId: number,
    userMessage: string,
    onChunk: (chunk: ChatStreamResponse) => void
  ): Promise<void> {
    if (!this.apiKey) {
      throw new AppError('GEMINI_API_KEY mancante', 500);
    }

    const session = await this.getSessionOrThrow(userId, chatId);
    const sessionMetadata = this.asMetadata(session.metadata);

    if (!this.isVoyagerMode(session.mode)) {
      throw new AppError('Le sessioni Builder non usano lo streaming Voyager. Usa il builder dedicato per modificare l’itinerario.', 409);
    }

    if (sessionMetadata.plannerLocked || sessionMetadata.generatedItineraryId) {
      throw new AppError('La conversazione Planner è bloccata dopo la generazione dell’itinerario.', 409);
    }

    const persistedMessages = this.toDbMessages(session.messages);

    await prisma.chatMessage.create({
      data: {
        chatId,
        role: 'user',
        content: userMessage
      }
    });

    const voyagerMode = session.mode;
    const baseState = this.normalizePlannerState(sessionMetadata.plannerState);
    const transcript = this.buildTranscript(persistedMessages, userMessage);
    const extractedState = await this.extractPlannerState(voyagerMode, transcript, baseState);
    const destinationCandidate = this.sanitizeDestinationCandidate(extractedState.destination);
    const bestLocation = destinationCandidate
      ? await this.findBestLocation(destinationCandidate)
      : null;
    const plannerState = this.mergePlannerState(baseState, extractedState, bestLocation);
    const userProfileContext = await this.getUserProfileContext(userId);

    const history = persistedMessages
      .slice(-16)
      .map((message) => ({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }]
      }));

    let fullReply = '';

    try {
      let lastError: unknown = null;
      const ai = new GoogleGenerativeAI(this.apiKey);
      const maxAttemptsPerModel = 3;

      for (const modelName of this.modelFallbacks) {
        let modelSucceeded = false;

        for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt += 1) {
          const model = ai.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: voyagerMode === 'planner' ? 0.75 : 0.6,
              topP: 0.85,
              topK: 40
            },
            systemInstruction: {
              role: 'system',
              parts: [{ text: this.getSystemInstruction(voyagerMode, plannerState, Boolean(bestLocation), userProfileContext) }]
            }
          });

          const chat = model.startChat({
            history: history as any
          });

          let attemptReply = '';

          try {
            const result = await chat.sendMessageStream(userMessage);

            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              if (!chunkText) continue;

              attemptReply += chunkText;
              onChunk({
                reply: chunkText,
                done: false
              });
            }

            fullReply = attemptReply;
            lastError = null;
            modelSucceeded = true;
            break;
          } catch (error) {
            lastError = error;
            const status = Number((error as any)?.status || (error as any)?.statusCode || 0);
            const hasPartialReply = attemptReply.length > 0;
            const canRetry = this.shouldRetryGeminiStreamError(error, hasPartialReply);

            if (!canRetry) {
              throw error;
            }

            if (attempt < maxAttemptsPerModel) {
              console.warn(`Gemini stream transient error on ${modelName} (attempt ${attempt}/${maxAttemptsPerModel}), retrying...`);
              await this.delay(Math.min(3000, 700 * attempt));
              continue;
            }

            const reason = status === 429
              ? 'rate limit reached'
              : this.isTransientGeminiNetworkError(error)
                ? 'network error'
                : `status ${status || 'unknown'}`;

            console.warn(`Gemini stream ${reason} on ${modelName}, trying fallback model...`);
          }
        }

        if (modelSucceeded) {
          break;
        }
      }

      if (lastError) {
        throw lastError;
      }

      const finalState = await this.finalizePlannerState(voyagerMode, plannerState, [
        ...persistedMessages,
        { role: 'user', content: userMessage, createdAt: new Date() },
        { role: 'assistant', content: fullReply, createdAt: new Date() }
      ]);

      const hintWorkspace = finalState.locationId
        ? await this.itineraryService.getWorkspaceData(finalState.locationId, userId)
        : null;
      const chatHints = this.buildChatHints(
        voyagerMode,
        finalState,
        transcript,
        fullReply,
        hintWorkspace
      );

      const enrichedState = enrichPlannerStateDefaults(finalState);
      const normalizedReply = normalizePlannerAssistantReply({
        mode: voyagerMode,
        userMessage,
        assistantReply: fullReply,
        state: enrichedState,
      });
      const readyToGenerate = resolveReadyToGenerate(
        voyagerMode,
        enrichedState,
        normalizedReply,
        userMessage
      );
      const suggestedTitle = await this.suggestTitle(
        session.title,
        voyagerMode,
        finalState,
        userMessage,
        normalizedReply,
        persistedMessages.length
      );

      await prisma.chatMessage.create({
        data: {
          chatId,
          role: 'assistant',
          content: normalizedReply
        }
      });

      const mergedMetadata = {
        ...sessionMetadata,
        plannerState: enrichedState,
        readyToGenerate,
        plannerLocked: Boolean(sessionMetadata.plannerLocked),
        suggestions: chatHints.suggestions,
        actions: chatHints.actions,
        lastUserPrompt: userMessage,
        lastAssistantReply: normalizedReply
      };

      await prisma.chatSession.update({
        where: { id: chatId },
        data: {
          title: suggestedTitle,
          locationId: enrichedState.locationId ?? session.locationId,
          lastMessageAt: new Date(),
          metadata: this.toJsonValue(mergedMetadata)
        }
      });

      onChunk({
        reply: '',
        done: true,
        metadata: {
          plannerState: enrichedState,
          readyToGenerate,
          suggestedTitle,
          suggestions: chatHints.suggestions,
          actions: chatHints.actions
        }
      });
    } catch (error) {
      console.error('Gemini Stream Error:', error);
      throw this.mapGeminiStreamError(error);
    }
  }

  async generateItineraryFromSession(userId: number, chatId: number) {
    const session = await this.getSessionOrThrow(userId, chatId);
    const sessionMetadata = this.asMetadata(session.metadata);

    if (session.mode !== 'planner') {
      throw new AppError('La generazione itinerario è disponibile solo in Planner Mode', 400);
    }

    const dbMessages = this.toDbMessages(session.messages);
    let refreshedState = await this.finalizePlannerState(
      'planner',
      this.normalizePlannerState(sessionMetadata.plannerState),
      dbMessages
    );
    let enrichedPlannerState = enrichPlannerStateDefaults(refreshedState);

    const lastAssistant = [...session.messages]
      .reverse()
      .find((message) => message.role === 'assistant');
    const assistantReply =
      lastAssistant?.content || String(sessionMetadata.lastAssistantReply || '');

    if (!enrichedPlannerState.locationId && enrichedPlannerState.destination) {
      const matched = await this.findBestLocation(enrichedPlannerState.destination);
      if (matched) {
        enrichedPlannerState = {
          ...enrichedPlannerState,
          destination: matched.name,
          locationId: matched.id,
        };
      }
    }

    if (!enrichedPlannerState.destination && session.title) {
      const fromTitle = await this.findBestLocation(session.title);
      if (fromTitle) {
        enrichedPlannerState = {
          ...enrichedPlannerState,
          destination: fromTitle.name,
          locationId: fromTitle.id,
        };
      }
    }

    if (
      !enrichedPlannerState.days &&
      (assistantDeclaresItineraryReady(assistantReply) || sessionMetadata.readyToGenerate)
    ) {
      enrichedPlannerState = { ...enrichedPlannerState, days: 3 };
    }

    const lastUserMessage = [...session.messages]
      .reverse()
      .find((message) => message.role === 'user');

    const canGenerate = canGenerateItineraryFromSession({
      mode: session.mode,
      state: enrichedPlannerState,
      assistantReply,
      metadataReadyToGenerate: Boolean(sessionMetadata.readyToGenerate),
      userMessage: lastUserMessage?.content,
    });

    if (!canGenerate) {
      const missing = getMissingPlannerFields(enrichedPlannerState);
      throw new AppError(
        missing.length
          ? `Mancano ancora: ${missing.join(', ')}. Continua la conversazione con Smartfare AI.`
          : 'La chat non ha ancora raccolto abbastanza dettagli per creare l’itinerario.',
        400
      );
    }

    if (!enrichedPlannerState.locationId) {
      throw new AppError(
        `La destinazione "${enrichedPlannerState.destination || 'indicata'}" non è nel catalogo SmartFare. Scegli una città supportata (es. Bari, Lecce, Firenze).`,
        400
      );
    }

    await prisma.chatSession.update({
      where: { id: chatId },
      data: {
        locationId: enrichedPlannerState.locationId,
        metadata: this.toJsonValue({
          ...sessionMetadata,
          plannerState: enrichedPlannerState,
          readyToGenerate: true,
        }),
      },
    });
    // Idempotency: if an itinerary has already been generated for this session, return it
    if (sessionMetadata.generatedItinerary && (sessionMetadata.generatedItinerary as any).id) {
      return sessionMetadata.generatedItinerary;
    }
    const workspace = await this.itineraryService.getWorkspaceData(enrichedPlannerState.locationId, userId);
    if (!workspace.location) {
      throw new AppError('Workspace destinazione non disponibile.', 404);
    }

    const generationPrompt = this.buildItineraryPrompt(enrichedPlannerState, this.toDbMessages(session.messages));
    const generated = await this.geminiPlannerService.generateInitialItinerary(generationPrompt, {
      location: {
        id: workspace.location.id,
        name: workspace.location.name,
        city: workspace.location.name,
        province: workspace.location.province ?? undefined,
        country: 'Italia'
      },
      itinerary: null,
      accommodations: workspace.accommodations,
      activities: workspace.activities,
      categories: workspace.categories
    });

    if (!generated || !Array.isArray(generated.items) || generated.items.length === 0) {
      throw new AppError('In questo momento i servizi di Smartfare AI sono in sovraccarico. Riprova tra un istante.', 500);
    }

    const startDate = this.buildStartDate(enrichedPlannerState.period);
    const transcript = this.toDbMessages(session.messages)
      .filter((message) => message.role === 'user')
      .map((message) => message.content)
      .join(' ');
    const enrichedItems = this.buildRichItineraryItems(
      generated.items,
      enrichedPlannerState,
      workspace,
      startDate,
      transcript
    );

    const itineraryData = {
      name: generated.name || this.suggestItineraryName(enrichedPlannerState),
      description: generated.description || this.buildItineraryDescription(enrichedPlannerState),
      startDate: new Date(startDate),
      endDate: new Date(this.buildEndDate(startDate, enrichedPlannerState.days || 3)),
      locationId: workspace.location.id,
      chatSessionId: chatId,
      userId,
      items: {
        create: enrichedItems.map((item: any) => ({
          dayNumber: item.dayNumber,
          orderInt: item.orderInt,
          itemTypeCode: item.itemTypeCode,
          activityId: item.activityId,
          accommodationId: item.accommodationId,
          note: item.note,
          groupName: item.groupName,
          plannedStartAt: item.plannedStartAt ? new Date(item.plannedStartAt) : null,
          plannedEndAt: item.plannedEndAt ? new Date(item.plannedEndAt) : null,
          groupStartAt: item.groupStartAt ? new Date(item.groupStartAt) : null,
          groupEndAt: item.groupEndAt ? new Date(item.groupEndAt) : null
        }))
      }
    };

    const savedItinerary = await prisma.itinerary.create({
      data: itineraryData,
      include: {
        location: true,
        items: {
          include: {
            activity: true,
            accommodation: true
          }
        }
      }
    });

    await prisma.chatSession.update({
      where: { id: chatId },
      data: {
        metadata: this.toJsonValue({
          ...sessionMetadata,
          plannerState: enrichedPlannerState,
          readyToGenerate: true,
          plannerLocked: true,
          generatedItineraryId: savedItinerary.id,
          generatedItinerary: savedItinerary
        })
      }
    });

    return savedItinerary;
  }

  private async getSessionOrThrow(userId: number, chatId: number) {
    const session = await prisma.chatSession.findFirst({
      where: { id: chatId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session) {
      throw new AppError('Sessione non trovata', 404);
    }

    return session;
  }

  private getSystemInstruction(mode: VoyagerChatMode, plannerState: PlannerState, hasSupportedLocation: boolean, userCtx?: UserProfileContext | null): string {
    const userBlock = this.buildUserProfileBlock(userCtx);
    const base = [
      'Sei Smartfare AI, concierge premium di SmartFare.',
      'Rispondi sempre in italiano con tono elegante, chiaro e utile.',
      'Non parlare mai di budget, prezzi, costi o spesa.',
      'Quando citi preferenze usa solo categorie qualitative come ritmo, stile, interessi, atmosfera e tipologia di viaggio.',
      'Evita testi troppo lunghi: 2-4 paragrafi brevi o una lista corta quando serve.',
      ...(userBlock ? [userBlock] : []),
    ];

    if (mode === 'assistant') {
      return [
        ...base,
        'Sei in Assistant Mode: aiuta con consigli informativi su destinazioni, quartieri, musei, food, nightlife, spiagge, hotel per stile e idee di viaggio.',
        'Non proporre automaticamente la generazione itinerario.',
        'Se l’utente vuole pianificare un viaggio completo, invitalo gentilmente a passare a Planner Mode.'
      ].join('\n');
    }

    const missingFields = this.getMissingPlannerFields(plannerState);
    const needsDestination = missingFields.includes('destinazione');
    const supportedLocationNote = hasSupportedLocation
      ? 'La destinazione è supportata dal builder SmartFare.'
      : 'Se la destinazione non è supportata dal builder SmartFare, spiega con tatto che per generare l’itinerario finale serve una destinazione presente nel catalogo.';

    return [
      ...base,
      'Sei in Planner Mode: il tuo obiettivo è raccogliere i dettagli essenziali e preparare un itinerario da inviare al builder.',
      'REGOLA FERREA: NON scrivere mai itinerari giorno per giorno nella chat (niente "Giorno 1/Giorno 2", niente elenchi mattina/pranzo/sera). La generazione vera avviene nel builder dopo conferma dell’utente.',
      'PRIORITÀ ASSOLUTA: se manca la destinazione, fai UNA sola domanda per capire dove vuole andare. Non chiedere giorni, viaggiatori, interessi o stile finché la destinazione non è chiara e confermata dall’utente.',
      'Se l’utente saluta, chiede se sei operativo o fa domande generiche, rispondi in 1-2 frasi e riportalo gentilmente alla pianificazione chiedendo la destinazione.',
      'Dopo la destinazione raccogli in ordine: giorni, tipo di viaggio, viaggiatori, interessi, ritmo, stile/periodo, hotel style.',
      'Fai una sola domanda principale per volta, salvo quando mancano solo 1-2 dettagli molto collegati.',
      'Non assumere mai una destinazione se l’utente non l’ha detta esplicitamente.',
      'Quando hai abbastanza dati O l’utente chiede di creare/generare l’itinerario, rispondi in massimo 2-3 frasi brevi e includi SEMPRE la frase: "Il tuo itinerario è pronto".',
      'Se l’utente chiede "crea l’itinerario" o simili, NON proporre un piano testuale: conferma che hai tutto e usa "Il tuo itinerario è pronto".',
      'Quando l’utente chiede musei, food, notte, natura o percorsi, proponi idee brevi senza costruire l’itinerario completo in chat.',
      'Non inventare disponibilità reali o prezzi.',
      needsDestination
        ? 'Oggi il primo passo è SOLO la destinazione: non proporre ancora durata o dettagli secondari.'
        : 'La destinazione è già nota: puoi raccogliere i dettagli mancanti elencati sotto.',
      `Stato strutturato corrente: ${JSON.stringify(plannerState)}`,
      `Campi ancora mancanti: ${missingFields.join(', ') || 'nessuno'}`,
      supportedLocationNote
    ].join('\n');
  }

  private buildUserProfileBlock(ctx?: UserProfileContext | null): string | null {
    return buildUserPreferencePromptBlock(ctx ?? null);
  }

  private async getUserProfileContext(userId: number): Promise<UserProfileContext | null> {
    return loadUserPreferenceForAi(userId);
  }

  private buildTranscript(messages: DbMessage[], userMessage: string): string {
    const compactHistory = messages
      .slice(-12)
      .map((message) => `${message.role === 'user' ? 'Utente' : 'Assistant'}: ${message.content}`)
      .join('\n');

    return `${compactHistory}\nUtente: ${userMessage}`.trim();
  }

  private async extractPlannerState(mode: VoyagerChatMode, transcript: string, fallback: PlannerState): Promise<Partial<PlannerState>> {
    if (mode !== 'planner' || !this.apiKey) {
      return {};
    }

    const prompt = [
      'Estrai dati strutturati da questa conversazione di pianificazione viaggio.',
      'Restituisci SOLO JSON valido.',
      'Non inserire budget o prezzi.',
      'Se un dato non è chiaro, usa null o array vuoto.',
      'IMPORTANTE: estrai "destination" SOLO se l’utente nomina esplicitamente una città/località di viaggio.',
      'NON usare come destinazione: saluti, "sei operativo", "funziona", parole comuni o sottostringhe casuali (es. "operativo" NON è "Opera").',
      'Se l’utente non ha indicato dove vuole andare, destination deve essere null.',
      'Schema JSON:',
      '{"destination":null,"days":null,"travelType":null,"travelers":null,"interests":[],"pace":null,"style":null,"period":null,"departureAirport":null,"hotelStyle":null}',
      `Fallback corrente: ${JSON.stringify(fallback)}`,
      `Conversazione:\n${transcript}`
    ].join('\n');

    const ai = new GoogleGenerativeAI(this.apiKey);

    for (const modelName of this.modelFallbacks) {
      try {
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = this.safeParseJson(text);
        if (parsed) return parsed;
      } catch (error) {
        // Fallback al prossimo modello in caso di rate limit o errore
        console.warn(`Fallimento extractPlannerState su ${modelName}, provo fallback...`);
      }
    }
    return {};
  }

  private async finalizePlannerState(
    mode: VoyagerChatMode,
    currentState: PlannerState,
    messages: DbMessage[]
  ): Promise<PlannerState> {
    if (mode !== 'planner') {
      return currentState;
    }

    const transcript = messages
      .slice(-16)
      .map((message) => `${message.role === 'user' ? 'Utente' : 'Assistant'}: ${message.content}`)
      .join('\n');

    const extracted = await this.extractPlannerState(mode, transcript, currentState);
    const destinationCandidate = this.sanitizeDestinationCandidate(
      extracted.destination || currentState.destination
    );
    const location = destinationCandidate
      ? await this.findBestLocation(destinationCandidate)
      : null;
    return this.mergePlannerState(currentState, extracted, location);
  }

  private mergePlannerState(
    baseState: PlannerState,
    nextState: Partial<PlannerState>,
    matchedLocation?: { id: number; name: string } | null
  ): PlannerState {
    const interests = Array.from(
      new Set([...(baseState.interests || []), ...((nextState.interests as string[] | undefined) || [])].filter(Boolean))
    );

    const explicitDestination = this.sanitizeDestinationCandidate(
      nextState.destination || baseState.destination
    );
    const resolvedLocation =
      explicitDestination && matchedLocation
        ? matchedLocation
        : explicitDestination
          ? null
          : matchedLocation && baseState.locationId === matchedLocation.id
            ? matchedLocation
            : null;

    return {
      destination: explicitDestination || (resolvedLocation?.name ?? null),
      locationId: resolvedLocation?.id || baseState.locationId || null,
      days: this.normalizeNumber(nextState.days) || baseState.days || null,
      travelType: nextState.travelType || baseState.travelType || null,
      travelers: nextState.travelers || baseState.travelers || null,
      interests,
      pace: nextState.pace || baseState.pace || null,
      style: nextState.style || baseState.style || null,
      period: nextState.period || baseState.period || null,
      departureAirport: nextState.departureAirport || baseState.departureAirport || null,
      hotelStyle: nextState.hotelStyle || baseState.hotelStyle || null
    };
  }

  private normalizePlannerState(raw: any): PlannerState {
    return {
      destination: raw?.destination || null,
      locationId: this.normalizeNumber(raw?.locationId),
      days: this.normalizeNumber(raw?.days),
      travelType: raw?.travelType || null,
      travelers: raw?.travelers || null,
      interests: Array.isArray(raw?.interests) ? raw.interests.filter((entry: unknown) => typeof entry === 'string') : [],
      pace: raw?.pace || null,
      style: raw?.style || null,
      period: raw?.period || null,
      departureAirport: raw?.departureAirport || null,
      hotelStyle: raw?.hotelStyle || null
    };
  }

  private getMissingPlannerFields(state: PlannerState): string[] {
    return getMissingPlannerFields(enrichPlannerStateDefaults(state));
  }

  private isReadyToGenerate(mode: VoyagerChatMode, state: PlannerState): boolean {
    if (mode !== 'planner') return false;
    return isPlannerStructurallyReady(state);
  }

  private async suggestTitle(
    currentTitle: string | null,
    mode: VoyagerChatMode,
    state: PlannerState,
    userMessage: string,
    assistantReply: string,
    persistedMessageCount: number
  ): Promise<string> {
    // Titles that are placeholders and should be replaced with an AI-generated one
    const defaultTitles = [
      DEFAULT_TITLE,
      'Nuova sessione Planner',
      'Nuova sessione Assistant',
      'Smartfare AI'
    ];

    const hasCustomTitle =
      currentTitle !== null &&
      currentTitle !== undefined &&
      !defaultTitles.includes(currentTitle.trim());

    // Keep a custom (AI-generated or user-edited) title as-is
    if (hasCustomTitle) {
      return currentTitle!;
    }

    // Try AI title generation on the first two exchanges (0 or 2 persisted messages)
    const isEarlyExchange = persistedMessageCount <= 2;
    if (isEarlyExchange) {
      const aiTitle = await this.generateSessionTitle(mode, state, userMessage, assistantReply);
      if (aiTitle) {
        return aiTitle;
      }
    }

    // State-based fallbacks (not locked — next exchange may still produce an AI title)
    if (state.destination && state.days) {
      return `${state.days} giorni a ${state.destination}`;
    }

    if (state.destination) {
      return `Viaggio a ${state.destination}`;
    }

    return userMessage.split(/[.!?\n]/)[0].slice(0, 48).trim() || DEFAULT_TITLE;
  }

  private async generateSessionTitle(
    mode: VoyagerChatMode,
    state: PlannerState,
    userMessage: string,
    assistantReply: string
  ): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    const prompt = [
      'Genera un titolo breve per una chat travel premium di SmartFare.',
      'Restituisci solo il titolo, senza virgolette, markdown o spiegazioni.',
      'Massimo 5 parole.',
      'Il titolo deve essere naturale, specifico e utile nella sidebar.',
      `Modalita: ${mode}.`,
      `Planner state: ${JSON.stringify(state)}.`,
      `Messaggio utente: ${userMessage}`,
      `Risposta assistant: ${assistantReply}`
    ].join('\n');

    const ai = new GoogleGenerativeAI(this.apiKey);

    for (const modelName of this.modelFallbacks) {
      try {
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const rawTitle = result.response.text().replace(/["'*`#]/g, ' ').trim();
        const cleanTitle = rawTitle
          .split('\n')[0]
          ?.replace(/\s+/g, ' ')
          .trim()
          .slice(0, 60);

        if (cleanTitle) return cleanTitle;
      } catch (error) {
        console.warn(`Fallimento generateSessionTitle su ${modelName}, provo fallback...`);
      }
    }
    return null;
  }

  private buildItineraryPrompt(state: PlannerState, messages: DbMessage[]): string {
    const recentUserMessages = messages
      .filter((message) => message.role === 'user')
      .slice(-4)
      .map((message) => message.content)
      .join(' | ');

    return [
      `Crea un itinerario di ${state.days || 3} giorni per ${state.destination}.`,
      state.travelType ? `Tipo di viaggio: ${state.travelType}.` : '',
      state.travelers ? `Viaggiatori: ${state.travelers}.` : '',
      state.interests?.length ? `Interessi principali: ${state.interests.join(', ')}.` : '',
      state.pace ? `Ritmo richiesto: ${state.pace}.` : '',
      state.style ? `Stile generale: ${state.style}.` : '',
      state.hotelStyle ? `Hotel style: ${state.hotelStyle}.` : '',
      state.period ? `Periodo: ${state.period}.` : '',
      'L’itinerario deve essere ricco e completo: ogni giorno deve avere colazione, attività principali, pranzo, attività pomeridiane e cena quando possibile.',
      'Inserisci orari realistici e distribuiti nella giornata.',
      'Se l’utente ha espresso desideri espliciti come Acquario, musei o monumenti, devono comparire davvero nell’itinerario finale.',
      recentUserMessages ? `Indicazioni conversazionali utili: ${recentUserMessages}.` : ''
    ]
      .filter(Boolean)
      .join(' ');
  }

  private buildItineraryDescription(state: PlannerState): string {
    const parts = [
      state.travelType,
      state.travelers,
      state.interests?.length ? `focus ${state.interests.join(', ')}` : null,
      state.pace ? `ritmo ${state.pace}` : null,
      state.style ? `stile ${state.style}` : null
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' · ') : 'Itinerario generato da Smartfare AI';
  }

  private buildChatHints(
    mode: VoyagerChatMode,
    plannerState: PlannerState,
    transcript: string,
    assistantReply: string,
    workspace: Awaited<ReturnType<ItineraryService['getWorkspaceData']>> | null
  ): { suggestions: ChatHintSuggestion[]; actions: ChatHintAction[] } {
    if (mode !== 'planner' || !workspace?.location) {
      return { suggestions: [], actions: [] };
    }

    const context = `${transcript} ${assistantReply}`.toLowerCase();
    const suggestions: ChatHintSuggestion[] = [];
    const actions: ChatHintAction[] = [];

    const pushSuggestion = (
      poi: { id: number; name: string },
      type: ChatHintSuggestion['type'],
      poiType: 'activity' | 'accommodation' = 'activity',
      description?: string
    ) => {
      if (suggestions.some((entry) => entry.poiId === poi.id && entry.poiType === poiType)) {
        return;
      }

      suggestions.push({
        title: poi.name,
        description,
        type,
        poiId: poi.id,
        poiType
      });
    };

    const matches = (keywords: string[]) => keywords.some((keyword) => context.includes(keyword));

    const museumLike = workspace.activities.filter((activity) => {
      const name = activity.name.toLowerCase();
      const category = activity.category?.name?.toLowerCase() || '';
      return category.includes('muse') || category.includes('monument') || category.includes('landmark') || category.includes('arte') || category.includes('chiese') || category.includes('castelli') || name.includes('acquario') || name.includes('museum');
    });

    const foodLike = workspace.activities.filter((activity) => {
      const category = activity.category?.name?.toLowerCase() || '';
      return ['ristoranti', 'caffe', 'panetterie', 'bar', 'enoteche', 'gelaterie'].includes(category);
    });

    const relaxLike = workspace.activities.filter((activity) => {
      const category = activity.category?.name?.toLowerCase() || '';
      return ['parchi', 'punti panoramici', 'mercati'].includes(category);
    });

    if (matches(['muse', 'cultur', 'arte', 'monument', 'acquario'])) {
      museumLike.slice(0, 3).forEach((activity) => pushSuggestion(activity, 'poi', 'activity', 'Tappa culturale reale nel workspace'));
      actions.push({
        type: 'add_stop',
        label: 'Aggiungi una tappa culturale',
        payload: { focus: 'culture' }
      });
    }

    if (matches(['food', 'ristor', 'pranzo', 'cena', 'aperitivo'])) {
      foodLike.slice(0, 3).forEach((activity) => pushSuggestion(activity, 'food', 'activity', 'Suggerimento food reale'));
      actions.push({
        type: 'optimize_route',
        label: 'Ottimizza il giro food',
        payload: { focus: 'food' }
      });
    }

    if (matches(['notte', 'night', 'sera', 'aperitivo'])) {
      foodLike.slice(0, 2).forEach((activity) => pushSuggestion(activity, 'evening', 'activity', 'Idea per la parte serale'));
      actions.push({
        type: 'create_nostalgic_day',
        label: 'Crea un giorno nostalgico',
        payload: { mood: 'nostalgic' }
      });
    }

    if (matches(['relax', 'natura', 'lento', 'nostalg', 'panorama'])) {
      relaxLike.slice(0, 3).forEach((activity) => pushSuggestion(activity, 'route', 'activity', 'Percorso più lento e panoramico'));
      actions.push({
        type: 'add_day',
        label: 'Aggiungi un giorno slow',
        payload: { pace: 'slow' }
      });
    }

    if (plannerState.days && plannerState.days < 5) {
      actions.push({
        type: 'add_day',
        label: 'Aggiungi un giorno extra',
        payload: { days: plannerState.days + 1 }
      });
    }

    if (suggestions.length === 0) {
      workspace.activities.slice(0, 3).forEach((activity) => pushSuggestion(activity, 'general', 'activity', 'Suggerimento utile dal workspace'));
    }

    return {
      suggestions: suggestions.slice(0, 3),
      actions: actions.slice(0, 3)
    };
  }

  private suggestItineraryName(state: PlannerState): string {
    if (state.destination && state.days) {
      return `${state.destination} in ${state.days} giorni`;
    }

    if (state.destination) {
      return `Viaggio a ${state.destination}`;
    }

    return 'Itinerario SmartFare';
  }

  private buildStartDate(period: string | null): string {
    if (period) {
      const explicitDateMatch = period.match(/\d{4}-\d{2}-\d{2}/);
      if (explicitDateMatch) {
        return explicitDateMatch[0];
      }
    }

    return new Date().toISOString().split('T')[0];
  }

  private buildEndDate(startDate: string, days: number): string {
    const base = new Date(startDate);
    base.setDate(base.getDate() + Math.max(0, days - 1));
    return base.toISOString().split('T')[0];
  }

  private buildRichItineraryItems(
    rawItems: any[],
    plannerState: PlannerState,
    workspace: Awaited<ReturnType<ItineraryService['getWorkspaceData']>>,
    startDate: string,
    transcript: string
  ) {
    const usedActivityIds = new Set<number>();
    const usedAccommodationIds = new Set<number>();
    const activityById = new Map(workspace.activities.map((activity) => [activity.id, activity]));
    const accommodationById = new Map(workspace.accommodations.map((accommodation) => [accommodation.id, accommodation]));

    let items = (rawItems || [])
      .map((item: any, index: number) => {
        const dayNumber = Number(item.dayNumber || 1);
        const concreteDate = item.date ? new Date(item.date) : new Date(startDate);
        if (item.date) concreteDate.setDate(concreteDate.getDate() + (dayNumber - 1));

        const dateStr = concreteDate.toISOString().split('T')[0];

        return {
          dayNumber,
          orderInt: Number(item.orderInt || index + 1),
          itemTypeCode: item.itemTypeCode,
          activityId: item.activityId ?? undefined,
          accommodationId: item.accommodationId ?? undefined,
          note: item.note ?? undefined,
          groupName: item.groupName ?? undefined,
          plannedStartAt: this.resolvePlannedDateTime(startDate, dayNumber, item.timeSlotStart || item.plannedStartAt),
          plannedEndAt: this.resolvePlannedDateTime(startDate, dayNumber, item.timeSlotEnd || item.plannedEndAt)
        };
      })
      .filter((item) => item.itemTypeCode === 'ACTIVITY' || item.itemTypeCode === 'ACCOMMODATION')
      .filter((item) => {
        if (item.itemTypeCode === 'ACTIVITY') {
          if (!item.activityId || !activityById.has(item.activityId)) return false;
          usedActivityIds.add(item.activityId);
        }

        if (item.itemTypeCode === 'ACCOMMODATION') {
          if (!item.accommodationId || !accommodationById.has(item.accommodationId)) return false;
          usedAccommodationIds.add(item.accommodationId);
        }

        return true;
      });

    items = this.ensureMustSeeItems(items, workspace, transcript, startDate, usedActivityIds);
    items = this.ensureDailyCoverage(items, plannerState, workspace, startDate, usedActivityIds, usedAccommodationIds);
    return this.normalizeItineraryItems(items, startDate);
  }

  private ensureMustSeeItems(
    items: any[],
    workspace: Awaited<ReturnType<ItineraryService['getWorkspaceData']>>,
    transcript: string,
    startDate: string,
    usedActivityIds: Set<number>
  ) {
    const lowerTranscript = transcript.toLowerCase();
    const needsAquarium = lowerTranscript.includes('acquario');
    const hasAquarium = items.some((item) => {
      const activity = item.activityId ? workspace.activities.find((entry) => entry.id === item.activityId) : null;
      return activity?.name.toLowerCase().includes('acquario');
    });

    if (needsAquarium && !hasAquarium) {
      const aquarium = workspace.activities.find(
        (activity) =>
          activity.name.toLowerCase().includes('acquario') &&
          !usedActivityIds.has(activity.id)
      );

      if (aquarium) {
        usedActivityIds.add(aquarium.id);
        items.push({
          dayNumber: 1,
          orderInt: 2,
          itemTypeCode: 'ACTIVITY',
          activityId: aquarium.id,
          note: 'Visita all’Acquario, una delle esperienze chiave richieste per questo viaggio.',
          groupName: 'Mattina: Acquario e Porto Antico',
          plannedStartAt: this.resolvePlannedDateTime(startDate, 1, '10:00'),
          plannedEndAt: this.resolvePlannedDateTime(startDate, 1, '12:00')
        });
      }
    }

    return items;
  }

  private ensureDailyCoverage(
    items: any[],
    plannerState: PlannerState,
    workspace: Awaited<ReturnType<ItineraryService['getWorkspaceData']>>,
    startDate: string,
    usedActivityIds: Set<number>,
    usedAccommodationIds: Set<number>
  ) {
    const totalDays = Math.max(1, plannerState.days || 1);
    const normalizedItems = [...items];

    const foodCandidates = workspace.activities.filter((activity) =>
      ['ristoranti', 'caffe', 'panetterie', 'bar', 'enoteche', 'gelaterie', 'fast food'].includes(
        activity.category?.name?.toLowerCase() || ''
      )
    );
    const cultureCandidates = workspace.activities.filter((activity) =>
      ['musei', 'monumenti', 'landmark', 'chiese', 'castelli', 'punti panoramici', 'teatri', 'mercati', 'artigianato locale'].includes(
        activity.category?.name?.toLowerCase() || ''
      ) || activity.name.toLowerCase().includes('acquario')
    );
    const relaxCandidates = workspace.activities.filter((activity) =>
      ['parchi', 'punti panoramici', 'mercati'].includes(activity.category?.name?.toLowerCase() || '')
    );

    const firstAccommodation = workspace.accommodations[0];
    if (firstAccommodation && !usedAccommodationIds.has(firstAccommodation.id)) {
      usedAccommodationIds.add(firstAccommodation.id);
      normalizedItems.push({
        dayNumber: 1,
        orderInt: 1,
        itemTypeCode: 'ACCOMMODATION',
        accommodationId: firstAccommodation.id,
        note: 'Check-in e sistemazione nella struttura selezionata, punto di partenza per il viaggio.',
        groupName: 'Arrivo e check-in',
        plannedStartAt: this.resolvePlannedDateTime(startDate, 1, '14:30'),
        plannedEndAt: this.resolvePlannedDateTime(startDate, 1, '15:30')
      });
    }

    const slotTemplates = [
      { key: 'breakfast', groupName: 'Colazione locale', start: '08:30', end: '09:30', pool: foodCandidates },
      { key: 'morning', groupName: 'Mattina culturale', start: '10:00', end: '12:00', pool: cultureCandidates },
      { key: 'lunch', groupName: 'Pranzo', start: '13:00', end: '14:15', pool: foodCandidates },
      { key: 'afternoon', groupName: 'Pomeriggio di esplorazione', start: '15:00', end: '17:30', pool: [...cultureCandidates, ...relaxCandidates] },
      { key: 'dinner', groupName: 'Cena', start: '19:30', end: '21:00', pool: foodCandidates }
    ];

    for (let day = 1; day <= totalDays; day++) {
      const dayItems = normalizedItems.filter((item) => item.dayNumber === day);

      for (const slot of slotTemplates) {
        if (dayItems.length >= 5) break;

        const hasSlotCoverage = dayItems.some((item) => {
          const group = String(item.groupName || '').toLowerCase();
          const note = String(item.note || '').toLowerCase();
          return group.includes(slot.key) || group.includes(slot.groupName.toLowerCase()) || note.includes(slot.key);
        });

        if (hasSlotCoverage) {
          continue;
        }

        const candidate = slot.pool.find((activity) => !usedActivityIds.has(activity.id));
        if (!candidate) continue;

        usedActivityIds.add(candidate.id);
        dayItems.push({
          dayNumber: day,
          orderInt: dayItems.length + 1,
          itemTypeCode: 'ACTIVITY',
          activityId: candidate.id,
          note: this.buildSlotNote(candidate.name, slot.groupName, plannerState),
          groupName: slot.groupName,
          plannedStartAt: this.resolvePlannedDateTime(startDate, day, slot.start),
          plannedEndAt: this.resolvePlannedDateTime(startDate, day, slot.end)
        });
      }

      normalizedItems.push(...dayItems.filter((item) => !normalizedItems.includes(item)));
    }

    if (firstAccommodation && !normalizedItems.some((item) => item.dayNumber === totalDays && item.itemTypeCode === 'ACCOMMODATION')) {
      normalizedItems.push({
        dayNumber: totalDays,
        orderInt: 99,
        itemTypeCode: 'ACCOMMODATION',
        accommodationId: firstAccommodation.id,
        note: 'Check-out e chiusura del soggiorno, con tempo per recuperare bagagli e concludere il viaggio con calma.',
        groupName: 'Partenza',
        plannedStartAt: this.resolvePlannedDateTime(startDate, totalDays, '09:00'),
        plannedEndAt: this.resolvePlannedDateTime(startDate, totalDays, '10:00')
      });
    }

    return normalizedItems;
  }

  private normalizeItineraryItems(items: any[], startDate: string) {
    const withTimes = this.ensureMissingItemTimes(items, startDate);

    const ordered = withTimes
      .slice()
      .sort((left, right) => {
        if (left.dayNumber !== right.dayNumber) return left.dayNumber - right.dayNumber;
        const leftStart = left.plannedStartAt || '';
        const rightStart = right.plannedStartAt || '';
        if (leftStart !== rightStart) return leftStart.localeCompare(rightStart);
        return (left.orderInt || 0) - (right.orderInt || 0);
      });

    const orderByDay = new Map<number, number>();

    const reordered = ordered.map((item) => {
      const nextOrder = (orderByDay.get(item.dayNumber) || 0) + 1;
      orderByDay.set(item.dayNumber, nextOrder);
      return {
        ...item,
        orderInt: nextOrder
      };
    });

    return applyGroupLevelTiming(reordered);
  }

  private ensureMissingItemTimes(items: any[], startDate: string) {
    const defaultSlots = [
      { start: '08:30', end: '09:30', keywords: ['colazion', 'breakfast'] },
      { start: '10:00', end: '12:00', keywords: ['mattin', 'morning', 'muse', 'monument', 'cultur', 'visita', 'stor'] },
      { start: '13:00', end: '14:15', keywords: ['pranzo', 'lunch'] },
      { start: '15:00', end: '17:30', keywords: ['pomerigg', 'afternoon', 'esplor', 'spiagg'] },
      { start: '19:30', end: '21:00', keywords: ['cena', 'dinner', 'sera', 'notturn', 'discotec', 'movida'] },
      { start: '14:00', end: '16:00', keywords: ['arrivo', 'check-in', 'check in', 'allogg'] },
      { start: '09:00', end: '10:00', keywords: ['partenz', 'check-out', 'checkout'] }
    ];
    const fallbackSlots = [
      { start: '08:30', end: '09:30' },
      { start: '10:00', end: '12:00' },
      { start: '13:00', end: '14:15' },
      { start: '15:00', end: '17:30' },
      { start: '19:30', end: '21:00' },
      { start: '21:30', end: '23:00' }
    ];

    const inferSlot = (labels: string[]) => {
      const text = labels.filter(Boolean).join(' ').toLowerCase();
      return defaultSlots.find((slot) => slot.keywords.some((keyword) => text.includes(keyword))) || null;
    };

    const hasTimes = (item: any) => Boolean(item.plannedStartAt && item.plannedEndAt);
    const result = items.map((item) => ({ ...item }));
    const byDay = new Map<number, any[]>();

    for (const item of result) {
      const day = Number(item.dayNumber || 1);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(item);
    }

    for (const [day, dayItems] of byDay.entries()) {
      const groupSlotByName = new Map<string, { start: string; end: string }>();

      for (const item of dayItems) {
        if (!item.groupName || !hasTimes(item)) continue;
        groupSlotByName.set(String(item.groupName), {
          start: this.extractTimeLabel(item.plannedStartAt) || '10:00',
          end: this.extractTimeLabel(item.plannedEndAt) || '12:00'
        });
      }

      const sorted = dayItems.slice().sort((left, right) => (left.orderInt || 0) - (right.orderInt || 0));
      let fallbackIndex = 0;

      for (const item of sorted) {
        if (hasTimes(item)) continue;

        const labels = [item.groupName, item.note];
        let slot = item.groupName ? groupSlotByName.get(String(item.groupName)) : null;
        if (!slot) slot = inferSlot(labels);
        if (!slot) {
          slot = fallbackSlots[Math.min(fallbackIndex, fallbackSlots.length - 1)];
          fallbackIndex += 1;
        }

        if (item.groupName) {
          groupSlotByName.set(String(item.groupName), slot);
        }

        item.plannedStartAt = this.resolvePlannedDateTime(startDate, day, slot.start);
        item.plannedEndAt = this.resolvePlannedDateTime(startDate, day, slot.end);
      }
    }

    return result;
  }

  private extractTimeLabel(value?: string | null) {
    if (!value) return null;
    const match = String(value).match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : null;
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

  private buildSlotNote(title: string, slotLabel: string, plannerState: PlannerState) {
    if (slotLabel.toLowerCase().includes('colazione')) {
      return `Sosta rilassata per iniziare la giornata con autenticita locale da ${title}.`;
    }

    if (slotLabel.toLowerCase().includes('pranzo')) {
      return `Pranzo pensato per mantenere un ritmo rilassato, con una pausa gradevole da ${title}.`;
    }

    if (slotLabel.toLowerCase().includes('cena')) {
      return `Cena conclusiva in linea con lo stile del viaggio, con atmosfera locale presso ${title}.`;
    }

    return `Tappa selezionata per un viaggio ${plannerState.pace || 'equilibrato'} con focus su ${plannerState.interests.join(', ') || 'esperienze locali'}: ${title}.`;
  }

  private safeParseJson(text: string): any | null {
    if (!text) return null;

    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1] || text;
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  private normalizeNumber(value: unknown): number | null {
    const parsed = Number(value);
    if (!parsed || Number.isNaN(parsed)) return null;
    return parsed;
  }

  private isTransientGeminiNetworkError(error: any): boolean {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '').toLowerCase();
    const causeCode = String(error?.cause?.code || '').toLowerCase();

    if (message.includes('fetch failed')) return true;

    const transientCodes = [
      'und_err_connect_timeout',
      'und_err_headers_timeout',
      'und_err_socket',
      'etimedout',
      'econnreset',
      'eai_again',
      'enotfound',
      'ecanceled'
    ];

    return transientCodes.includes(code) || transientCodes.includes(causeCode);
  }

  private shouldRetryGeminiStreamError(error: any, hasPartialReply: boolean): boolean {
    if (hasPartialReply) {
      return false;
    }

    const status = Number(error?.status || error?.statusCode || 0);
    return status === 429 || status === 503 || status === 504 || this.isTransientGeminiNetworkError(error);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private mapGeminiStreamError(error: any): AppError {
    const status = Number(error?.status || error?.statusCode || 0);
    const retryAfterSeconds = this.extractRetryAfterSeconds(error);

    if (status === 429 || status === 503 || status === 504) {
      const is503Family = status === 503 || status === 504;
      const baseMessage = is503Family
        ? 'I server di Smartfare AI sono al momento sovraccarichi per l\'alta richiesta.'
        : 'Smartfare AI e temporaneamente in sovraccarico.';

      const retryText = retryAfterSeconds
        ? ` Riprova tra circa ${retryAfterSeconds} secondi.`
        : ' Riprova tra un istante.';

      return new AppError(
        `${baseMessage}${retryText}`,
        503,
        {
          code: is503Family ? 'AI_SERVICE_UNAVAILABLE' : 'AI_OVERLOADED',
          retryAfterSeconds
        }
      );
    }

    if (this.isTransientGeminiNetworkError(error)) {
      return new AppError(
        'Connessione temporaneamente instabile con il servizio AI. Riprova tra qualche secondo.',
        503,
        {
          code: 'AI_NETWORK_ERROR',
          retryAfterSeconds: 5
        }
      );
    }

    return new AppError('Errore durante la comunicazione con l\'IA', 500);
  }

  private extractRetryAfterSeconds(error: any): number | null {
    const retryDelay = error?.errorDetails?.find?.(
      (detail: any) => detail?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
    )?.retryDelay;

    if (typeof retryDelay !== 'string') {
      return null;
    }

    const seconds = Number.parseInt(retryDelay.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(seconds) ? seconds : null;
  }

  private sanitizeDestinationCandidate(value?: string | null): string | null {
    const cleaned = value?.trim();
    if (!cleaned) return null;

    const lowered = cleaned.toLowerCase();
    const blocked = new Set([
      'operativo',
      'ciao',
      'salve',
      'grazie',
      'ok',
      'okay',
      'si',
      'sì',
      'no',
      'help',
      'aiuto'
    ]);

    if (blocked.has(lowered) || lowered.length < 3) {
      return null;
    }

    return cleaned;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async findBestLocation(sourceText: string) {
    const text = this.sanitizeDestinationCandidate(sourceText)?.toLowerCase();
    if (!text) return null;

    const locations = await prisma.location.findMany({
      select: { id: true, name: true }
    });

    const sorted = [...locations].sort((a, b) => b.name.length - a.name.length);

    const exact = sorted.find((location) => text === location.name.toLowerCase());
    if (exact) return exact;

    for (const location of sorted) {
      const name = location.name.toLowerCase();
      if (name.length < 3) continue;

      const boundaryPattern = new RegExp(
        `(?:^|[\\s,.:;!?()\\[\\]'\"«»\\-])${this.escapeRegex(name)}(?:$|[\\s,.:;!?()\\[\\]'\"«»\\-])`,
        'i'
      );

      if (boundaryPattern.test(text)) {
        return location;
      }
    }

    for (const location of sorted) {
      const name = location.name.toLowerCase();
      if (name.length < 4) continue;
      if (text.includes(name) || name.includes(text)) {
        return location;
      }
    }

    return null;
  }

  private asMetadata(metadata: unknown): Record<string, any> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }

    return metadata as Record<string, any>;
  }

  private toDbMessages(messages: Array<{ role: string; content: string; createdAt: Date }>): DbMessage[] {
    return messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
        createdAt: message.createdAt
      }));
  }

  private toJsonValue(value: unknown): any {
    return JSON.parse(JSON.stringify(value));
  }
}
