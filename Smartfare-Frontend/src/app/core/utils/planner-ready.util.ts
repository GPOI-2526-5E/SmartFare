import type { PlannerState } from '../services/voyager-chat.service';

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

export type ItineraryReadyCardInput = {
  mode: string;
  readyToGenerate: boolean;
  messages: Array<{ role: string; content: string; isStreaming?: boolean }>;
  plannerState: PlannerState | null | undefined;
  plannerLocked: boolean;
};

export function isItineraryReadyEligible(input: ItineraryReadyCardInput): boolean {
  if (input.mode !== 'planner' || input.plannerLocked) return false;
  if (input.messages.length === 0) return false;
  if (input.readyToGenerate) return true;

  const state = input.plannerState;
  if (!state?.destination) return false;

  const lastUser = [...input.messages].reverse().find((message) => message.role === 'user');
  if (lastUser && userRequestsItineraryGeneration(lastUser.content) && hasMinimumPlannerFieldsForGeneration(state)) {
    return true;
  }

  if (isPlannerStructurallyReady(state)) return true;

  const lastAssistant = [...input.messages]
    .reverse()
    .find((message) => message.role === 'assistant');

  return lastAssistant ? assistantSignalsPlannerComplete(lastAssistant.content) : false;
}

export function shouldShowItineraryReadyCard(input: ItineraryReadyCardInput): boolean {
  return isItineraryReadyEligible(input);
}

export function buildPlannerReadyAssistantReply(): string {
  return 'Perfetto! Ho raccolto tutti i dettagli per il tuo viaggio. Il tuo itinerario è pronto.';
}

export function shouldReplaceAssistantReplyWithReadyCard(content: string): boolean {
  return assistantWroteItineraryInChat(content) || content.length > 420;
}
