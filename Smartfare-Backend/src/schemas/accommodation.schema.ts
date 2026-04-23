import { z } from "zod";

export const getHotelsSchema = z.object({
    locationId: z.coerce.number().min(1, "ID location non valido")
});
