import prisma from "../../config/prisma";

type DraftItemPayload = {
    itemTypeCode: string;
    dayNumber: number;
    orderInt: number;
    title: string | null;
    note: string | null;
    plannedStartAt: Date | null;
    plannedEndAt: Date | null;
    activityId: number | null;
    accommodationId: number | null;
    routeSegmentId: number | null;
};

export class ItineraryService {

    private getItineraryInclude() {
        return {
            items: {
                include: {
                    activity: true,
                    accommodation: true,
                    routeSegment: true,
                    itemType: true
                },
                orderBy: [
                    { dayNumber: 'asc' as const },
                    { orderInt: 'asc' as const }
                ]
            }
        };
    }

    private buildItemData(data: any): DraftItemPayload[] {
        return (data?.items || []).map((item: any): DraftItemPayload => ({
            itemTypeCode: item.itemTypeCode,
            dayNumber: Number(item.dayNumber || 1),
            orderInt: Number(item.orderInt || 1),
            title: item.title || null,
            note: item.note || null,
            plannedStartAt: item.plannedStartAt ? new Date(item.plannedStartAt) : null,
            plannedEndAt: item.plannedEndAt ? new Date(item.plannedEndAt) : null,
            activityId: item.activityId ? Number(item.activityId) : null,
            accommodationId: item.accommodationId ? Number(item.accommodationId) : null,
            routeSegmentId: item.routeSegmentId ? Number(item.routeSegmentId) : null
        }));
    }

    private async withLocation(itinerary: any) {
        if (!itinerary) return itinerary;
        if (!itinerary.locationId) return { ...itinerary, location: null };

        const location = await prisma.location.findUnique({ where: { id: itinerary.locationId } });
        return { ...itinerary, location };
    }

    async saveItinerary(userId: number, data: any) {
        try {
            const { id, name, description, startDate, endDate, isPublished, locationId } = data;
            const items = this.buildItemData(data);
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

                await prisma.itinerary.update({
                    where: { id: Number(id) },
                    data: {
                        ...draftPayload,
                        ...(locationId ? { locationId: Number(locationId) } : { locationId: null })
                    }
                });

                await prisma.itineraryItem.deleteMany({
                    where: { itineraryId: Number(id) }
                });

                if (items.length > 0) {
                    await prisma.itineraryItem.createMany({
                        data: items.map((item: DraftItemPayload) => ({
                            ...item,
                            itineraryId: Number(id)
                        }))
                    });
                }

                const updated = await prisma.itinerary.findUnique({
                    where: { id: Number(id) },
                    include: this.getItineraryInclude()
                });

                return this.withLocation(updated);
            }

            // If no ID is provided, we skip update and transition to creation logic.
            // (Previously we were auto-picking the 'latestDraft' here, which caused data loss when intentionally starting a new itinerary).

            // Create new
            const createData: any = {
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
            };

            if (locationId) {
                createData.location = {
                    connect: { id: Number(locationId) }
                };
            }

            const created = await prisma.itinerary.create({
                data: createData,
                include: this.getItineraryInclude()
            });

            if (items.length > 0) {
                await prisma.itineraryItem.createMany({
                    data: items.map((item: DraftItemPayload) => ({
                        ...item,
                        itineraryId: created.id
                    }))
                });
            }

            const createdWithItems = await prisma.itinerary.findUnique({
                where: { id: created.id },
                include: this.getItineraryInclude()
            });

            return this.withLocation(createdWithItems);
        } catch (error) {
            console.error("Errore salvataggio itinerario:", error);
            throw error;
        }
    }

    async getLatestDraft(userId: number) {
        try {
            const latest = await prisma.itinerary.findFirst({
                where: { userId, isPublished: false },
                orderBy: { updatedAt: 'desc' },
                include: this.getItineraryInclude()
            });

            return this.withLocation(latest);
        } catch (error) {
            console.error("Errore recupero bozza:", error);
            throw error;
        }
    }

    async getWorkspaceData(locationId: number, userId?: number) {
        const [location, accommodations, activities, categories, draft] = await Promise.all([
            prisma.location.findUnique({ where: { id: locationId } }),
            prisma.accommodation.findMany({ where: { locationId } }),
            prisma.activity.findMany({
                where: { locationId },
                include: { category: true }
            }),
            prisma.activityCategory.findMany({ orderBy: { name: 'asc' } }),
            userId ? this.getLatestDraft(userId) : Promise.resolve(null)
        ]);

        return {
            location,
            accommodations,
            activities,
            categories,
            draft
        };
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
