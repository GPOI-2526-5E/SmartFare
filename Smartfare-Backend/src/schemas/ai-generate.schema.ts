import { z } from 'zod';

export const aiItineraryGenerateSchema = z.object({
    prompt: z.string().min(5, 'Il prompt deve contenere almeno 5 caratteri'),
});

export type AiItineraryGenerateRequest = z.infer<typeof aiItineraryGenerateSchema>;
