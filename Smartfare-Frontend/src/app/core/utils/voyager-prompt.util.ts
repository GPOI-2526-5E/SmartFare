import { ChatMode } from '../services/voyager-chat.service';

/** Sceglie Planner vs Assistant quando l’utente arriva dalla home AI bar. */
export function resolveVoyagerModeFromPrompt(prompt: string): ChatMode {
  const text = prompt.trim().toLowerCase();
  if (!text) return 'planner';

  const metaOnly =
    /^(ciao|buongiorno|buonasera|salve|hey|hello|grazie|ok|okay|sei operativo|sei attivo|funziona\??|come stai|chi sei)\b/i.test(
      text
    );
  if (metaOnly) return 'assistant';

  const planningSignals =
    /(viaggio|itinerario|giorni|notte|notti|weekend|settimana|visitare|organizza|pianifica|road\s*trip|honeymoon|vacanza|partire\s+per|voglio\s+andare|voglio\s+visitare|trip|travel)/i.test(
      text
    );

  if (planningSignals) return 'planner';

  // Messaggi brevi/ambigui → consigli mirati, non wizard itinerario
  if (text.length < 36) return 'assistant';

  return 'planner';
}
