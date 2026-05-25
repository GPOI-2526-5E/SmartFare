import type { PlannerState } from '../models/chat.model';

export function assistantDeclaresItineraryReady(content: string): boolean {
  const text = content.toLowerCase();
  return (
    /itinerario\s+(è|e)\s+pronto/.test(text) ||
    /il tuo itinerario è pronto/.test(text) ||
    /ho raccolto tutti i dettagli essenziali/.test(text)
  );
}

export function enrichPlannerStateDefaults(state: PlannerState): PlannerState {
  const interests = [...(state.interests || [])].filter(Boolean);
  const travelType = state.travelType || (state.pace?.toLowerCase().includes('rilass') ? 'relax' : null) || 'turismo';
  const travelers = state.travelers || 'non specificato';

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
  };
}

export function getMissingPlannerFields(state: PlannerState): string[] {
  const missing: string[] = [];
  if (!state.destination || !state.locationId) missing.push('destinazione');
  if (!state.days) missing.push('giorni');
  if (!state.travelType) missing.push('tipo viaggio');
  if (!state.travelers) missing.push('viaggiatori');
  if (!state.interests?.length) missing.push('interessi');
  if (!state.pace) missing.push('ritmo');
  if (!state.style && !state.hotelStyle) missing.push('stile');
  return missing;
}

export function isPlannerStructurallyReady(state: PlannerState): boolean {
  return getMissingPlannerFields(enrichPlannerStateDefaults(state)).length === 0;
}

export function resolveReadyToGenerate(
  mode: string,
  state: PlannerState,
  assistantReply: string
): boolean {
  if (mode !== 'planner') return false;

  const enriched = enrichPlannerStateDefaults(state);
  if (isPlannerStructurallyReady(enriched)) return true;
  if (!assistantDeclaresItineraryReady(assistantReply)) return false;

  return Boolean(enriched.destination && enriched.locationId && enriched.days);
}

/** Usato da POST /generate-itinerary: stesse regole della card + flag salvato in sessione. */
export function canGenerateItineraryFromSession(input: {
  mode: string;
  state: PlannerState;
  assistantReply: string;
  metadataReadyToGenerate?: boolean;
}): boolean {
  if (input.mode !== 'planner') return false;

  const enriched = enrichPlannerStateDefaults(input.state);
  if (input.metadataReadyToGenerate && enriched.locationId) {
    return true;
  }

  return resolveReadyToGenerate(input.mode, enriched, input.assistantReply);
}
