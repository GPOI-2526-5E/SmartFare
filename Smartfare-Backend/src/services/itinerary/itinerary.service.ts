import prisma from "../../config/prisma";

export class ItineraryService {

    async saveItinerary(userId: number, data: any) {
        try {
            const { id, name, description, startDate, endDate, isPublished } = data;
            const draftPayload = {
                name: name || "Il mio Viaggio",
                description,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                isPublished: isPublished === true ? true : false
            };

            // If an ID is provided, we try to update
            if (id) {
                const existing = await prisma.itinerary.findFirst({
                    where: { id: Number(id), userId }
                });

                if (!existing) {
                    throw new Error("Itinerario non trovato o non autorizzato");
                }

                return await prisma.itinerary.update({
                    where: { id: Number(id) },
                    data: draftPayload
                });
            }

            // If no ID is provided, we skip update and transition to creation logic.
            // (Previously we were auto-picking the 'latestDraft' here, which caused data loss when intentionally starting a new itinerary).

            // Create new
            return await prisma.itinerary.create({
                data: {
                    ...draftPayload,
                    user: {
                        connect: { id: userId }
                    },
                    visibility: {
                        connectOrCreate: {
                            where: { code: 'PRIVATE' },
                            create: {
                                code: 'PRIVATE',
                                name: 'Privato',
                                description: 'Itinerario visibile solo al proprietario'
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Errore salvataggio itinerario:", error);
            throw error;
        }
    }

    async getLatestDraft(userId: number) {
        try {
            return await prisma.itinerary.findFirst({
                where: { userId, isPublished: false },
                orderBy: { updatedAt: 'desc' },
                include: {
                    items: true
                }
            });
        } catch (error) {
            console.error("Errore recupero bozza:", error);
            throw error;
        }
    }

    async deleteItinerary(id: number, userId: number) {
        try {
            return await prisma.itinerary.delete({
                where: { id, userId }
            });
        } catch (error) {
            console.error("Errore eliminazione itinerario:", error);
            throw error;
        }
    }
}
