import type { PlannerState } from '../services/voyager-chat.service';

export function assistantDeclaresItineraryReady(content: string): boolean {
  const text = content.toLowerCase();
  return (
    /itinerario\s+(è|e)\s+pronto/.test(text) ||
    /il tuo itinerario è pronto/.test(text) ||
    /ho raccolto tutti i dettagli essenziali/.test(text)
  );
}

export function shouldShowItineraryReadyCard(input: {
  mode: string;
  readyToGenerate: boolean;
  messages: Array<{ role: string; content: string; isStreaming?: boolean }>;
  plannerState: PlannerState | null | undefined;
  plannerLocked: boolean;
}): boolean {
  if (input.mode !== 'planner' || input.plannerLocked) return false;
  if (input.messages.length === 0) return false;
  if (input.readyToGenerate) return true;

  const state = input.plannerState;
  if (!state?.destination) return false;

  const lastAssistant = [...input.messages]
    .reverse()
    .find((message) => message.role === 'assistant' && !message.isStreaming);

  return lastAssistant ? assistantDeclaresItineraryReady(lastAssistant.content) : false;
}
