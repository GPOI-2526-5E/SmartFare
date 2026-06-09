import type { PlannerState } from '../models/chat.model';

export function assistantDeclaresItineraryReady(content: string): boolean {
  const text = content.toLowerCase();
  return (
    /itinerario\s+(è|e)\s+pronto/.test(text) ||
    /il tuo itinerario è pronto/.test(text) ||
    /ho raccolto tutti i dettagli essenziali/.test(text)
  );
}

export function assistantSignalsPlannerComplete(content: string): boolean {
  const text = content.toLowerCase();
  return (
    assistantDeclaresItineraryReady(content) ||
    /abbiamo tutti gli elementi/.test(text) ||
    /elementi necessari/.test(text) ||
    /posso procedere a creare/.test(text) ||
    /ho tutto (il necessario|per generare)/.test(text) ||
    /siete pronti per partire/.test(text)
  );
}

export function userRequestsItineraryGeneration(message: string): boolean {
  const text = message.toLowerCase().trim();
  return (
    /\b(crea|genera|fammi|costruisci|prepara|procedi)\b.*\b(itinerario|piano di viaggio|piano)\b/.test(text) ||
    /\b(itinerario|piano)\b.*\b(crea|genera|pronto)\b/.test(text) ||
    /^(s[iì]|ok|vai|procedi|confermo|perfetto)\s*[!.?]*$/.test(text)
  );
}

export function assistantWroteItineraryInChat(content: string): boolean {
  const text = content.toLowerCase();
  return (
    (/giorno\s*[12]/.test(text) || /\*\*giorno\s*[12]/.test(text)) &&
    (/mattina|pomeriggio|sera/.test(text) || /colazione|pranzo|cena/.test(text))
  );
}

export function enrichPlannerStateDefaults(state: PlannerState): PlannerState {
  const interests = [...(state.interests || [])].filter(Boolean);
  const travelType = state.travelType || (state.pace?.toLowerCase().includes('rilass') ? 'relax' : null) || 'turismo';
  const travelers = state.travelers || 'non specificato';
  const style = state.style || state.hotelStyle || (state.pace ? state.pace : null);

  if (interests.length === 0) {
    if (state.style) interests.push(state.style);
    if (state.hotelStyle) interests.push(state.hotelStyle);
    if (state.pace) interests.push('esplorazione');
    if (interests.length === 0) interests.push('esperienze locali');
  }

  return {
    ...state,
    travelType,
    travelers,
    interests,
    style,
  };
}

export function getMissingPlannerFields(state: PlannerState): string[] {
  const missing: string[] = [];
  const enriched = enrichPlannerStateDefaults(state);

  if (!enriched.destination || !enriched.locationId) missing.push('destinazione');
  if (!enriched.days) missing.push('giorni');
  if (!enriched.travelType) missing.push('tipo viaggio');
  if (!enriched.travelers) missing.push('viaggiatori');
  if (!enriched.interests?.length) missing.push('interessi');
  if (!enriched.pace) missing.push('ritmo');
  if (!enriched.style && !enriched.hotelStyle && !enriched.pace) missing.push('stile');
  return missing;
}

export function isPlannerStructurallyReady(state: PlannerState): boolean {
  return getMissingPlannerFields(enrichPlannerStateDefaults(state)).length === 0;
}

export function hasMinimumPlannerFieldsForGeneration(state: PlannerState): boolean {
  const enriched = enrichPlannerStateDefaults(state);
  return Boolean(enriched.destination && enriched.locationId && enriched.days);
}

export function resolveReadyToGenerate(
  mode: string,
  state: PlannerState,
  assistantReply: string,
  userMessage?: string
): boolean {
  if (mode !== 'planner') return false;

  const enriched = enrichPlannerStateDefaults(state);
  const hasMinimum = hasMinimumPlannerFieldsForGeneration(enriched);

  if (userMessage && userRequestsItineraryGeneration(userMessage) && hasMinimum) {
    return true;
  }

  if (isPlannerStructurallyReady(enriched)) return true;

  if (!assistantSignalsPlannerComplete(assistantReply)) return false;

  return hasMinimum;
}

/** Usato da POST /generate-itinerary: stesse regole della card + flag salvato in sessione. */
export function canGenerateItineraryFromSession(input: {
  mode: string;
  state: PlannerState;
  assistantReply: string;
  metadataReadyToGenerate?: boolean;
  userMessage?: string;
}): boolean {
  if (input.mode !== 'planner') return false;

  const enriched = enrichPlannerStateDefaults(input.state);
  if (input.metadataReadyToGenerate && enriched.locationId) {
    return true;
  }

  return resolveReadyToGenerate(input.mode, enriched, input.assistantReply, input.userMessage);
}

export function buildPlannerReadyAssistantReply(): string {
  return 'Perfetto! Ho raccolto tutti i dettagli per il tuo viaggio. Il tuo itinerario è pronto.';
}

export function normalizePlannerAssistantReply(input: {
  mode: string;
  userMessage: string;
  assistantReply: string;
  state: PlannerState;
}): string {
  if (input.mode !== 'planner') return input.assistantReply;

  const enriched = enrichPlannerStateDefaults(input.state);
  const shouldReady = resolveReadyToGenerate(
    input.mode,
    enriched,
    input.assistantReply,
    input.userMessage
  );

  if (!shouldReady) return input.assistantReply;

  if (
    userRequestsItineraryGeneration(input.userMessage) ||
    assistantWroteItineraryInChat(input.assistantReply) ||
    input.assistantReply.length > 420
  ) {
    return buildPlannerReadyAssistantReply();
  }

  if (!assistantDeclaresItineraryReady(input.assistantReply)) {
    return `${input.assistantReply.trim()}\n\nIl tuo itinerario è pronto.`;
  }

  return input.assistantReply;
}
