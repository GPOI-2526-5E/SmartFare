import { z } from "zod";

export const itinerarySchema = z.object({
    id: z.coerce.number().optional(),
    name: z.string().min(3, "Il nome deve avere almeno 3 caratteri").optional(),
    description: z.string().nullish(),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullish(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullish(),
    isPublished: z.boolean().optional(),
});
