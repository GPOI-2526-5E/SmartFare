import prisma from "../../config/prisma";

type DraftItemPayload = {
    itemTypeCode: string;
    dayNumber: number;
    orderInt: number;
    note: string | null;
    plannedStartAt: Date | null;
    plannedEndAt: Date | null;
    groupName: string | null;
    groupStartAt: Date | null;
    groupEndAt: Date | null;
    activityId: number | null;
    accommodationId: number | null;
    trainsStationId: number | null;
    metroStationId: number | null;
    airportId: number | null;
};

export class ItineraryService {

    private getItineraryInclude() {
        return {
            items: {
                orderBy: [
                    { dayNumber: 'asc' as const },
                    { orderInt: 'asc' as const }
                ],
                select: {
                    id: true,
                    itineraryId: true,
                    itemTypeCode: true,
                    dayNumber: true,
                    orderInt: true,
                    note: true,
                    plannedStartAt: true,
                    plannedEndAt: true,
                    groupName: true,
                    groupStartAt: true,
                    groupEndAt: true,
                    activityId: true,
                    accommodationId: true,
                    trainsStationId: true,
                    metroStationId: true,
                    airportId: true,
                    activity: { select: { id: true, name: true, categoryId: true } },
                    accommodation: { select: { id: true, name: true } },
                    trainsStation: { select: { id: true, name: true } },
                    metroStation: { select: { id: true, name: true } },
                    airport: { select: { id: true, name: true } },
                    itemType: { select: { code: true, label: true } }
                }
            }
        };
    }

    private buildItemData(data: any): DraftItemPayload[] {
        return (data?.items || []).map((item: any): DraftItemPayload => ({
            itemTypeCode: item.itemTypeCode,
            dayNumber: Number(item.dayNumber || 1),
            orderInt: Number(item.orderInt || 1),
            note: item.note || null,
            plannedStartAt: item.plannedStartAt ? new Date(item.plannedStartAt) : null,
            plannedEndAt: item.plannedEndAt ? new Date(item.plannedEndAt) : null,
            groupName: item.groupName || null,
            groupStartAt: item.groupStartAt ? new Date(item.groupStartAt) : null,
            groupEndAt: item.groupEndAt ? new Date(item.groupEndAt) : null,
            activityId: item.activityId ? Number(item.activityId) : null,
            accommodationId: item.accommodationId ? Number(item.accommodationId) : null,
            trainsStationId: item.TrainsStationId ? Number(item.TrainsStationId) : (item.trainsStationId ? Number(item.trainsStationId) : null),
            metroStationId: item.MetroStationId ? Number(item.MetroStationId) : (item.metroStationId ? Number(item.metroStationId) : null),
            airportId: item.AirportId ? Number(item.AirportId) : (item.airportId ? Number(item.airportId) : null)
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

                const updated = await prisma.$transaction(async (tx) => {
                    await tx.itinerary.update({
                        where: { id: Number(id) },
                        data: {
                            ...draftPayload,
                            ...(locationId ? { locationId: Number(locationId) } : { locationId: null })
                        }
                    });

                    await tx.itineraryItem.deleteMany({
                        where: { itineraryId: Number(id) }
                    });

                    if (items.length > 0) {
                        await tx.itineraryItem.createMany({
                            data: items.map((item: DraftItemPayload) => ({
                                ...item,
                                itineraryId: Number(id)
                            }))
                        });
                    }

                    return tx.itinerary.findUnique({
                        where: { id: Number(id) },
                        include: this.getItineraryInclude()
                    });
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

            const createdWithItems = await prisma.$transaction(async (tx) => {
                const created = await tx.itinerary.create({
                    data: createData
                });

                if (items.length > 0) {
                    await tx.itineraryItem.createMany({
                        data: items.map((item: DraftItemPayload) => ({
                            ...item,
                            itineraryId: created.id
                        }))
                    });
                }

                return tx.itinerary.findUnique({
                    where: { id: created.id },
                    include: this.getItineraryInclude()
                });
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
        } catch (error: any) {
            console.error("Errore recupero bozza:", error);
            if (error?.code === 'P2022') {
                try {
                    const latestBasic = await prisma.itinerary.findFirst({
                        where: { userId, isPublished: false },
                        orderBy: { updatedAt: 'desc' }
                    });
                    if (!latestBasic) return this.withLocation(null);

                    const items = await prisma.itineraryItem.findMany({
                        where: { itineraryId: latestBasic.id },
                        orderBy: [
                            { dayNumber: 'asc' as const },
                            { orderInt: 'asc' as const }
                        ],
                        select: {
                            id: true,
                            itineraryId: true,
                            itemTypeCode: true,
                            dayNumber: true,
                            orderInt: true,
                            note: true,
                            plannedStartAt: true,
                            plannedEndAt: true,
                            groupName: true,
                            groupStartAt: true,
                            groupEndAt: true,
                            activityId: true,
                            accommodationId: true,
                            trainsStationId: true,
                            metroStationId: true,
                            airportId: true
                        }
                    });

                    const latestWithItems = { ...latestBasic, items };
                    return this.withLocation(latestWithItems);
                } catch (e2) {
                    console.error("Fallback fetch failed:", e2);
                    throw error;
                }
            }
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

    async getPublicItineraries(locationId?: number) {
        try {
            return await prisma.itinerary.findMany({
                where: { 
                    OR: [
                        { isPublished: true },
                        { visibilityCode: 'PUBLIC' }
                    ],
                    ...(locationId ? { locationId } : {})
                },
                take: 12,
                orderBy: { updatedAt: 'desc' },
                include: {
                    location: true,
                    user: {
                        include: { profile: true }
                    },
                    items: {
                        take: 3,
                        include: {
                            activity: { select: { imageUrl: true } },
                            accommodation: { select: { imageUrl: true } }
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Errore recupero itinerari pubblici:", error);
            throw error;
        }
    }

    async getPublicItineraryById(id: number) {
        try {
            return await prisma.itinerary.findUnique({
                where: { 
                    id,
                    OR: [
                        { isPublished: true },
                        { visibilityCode: 'PUBLIC' }
                    ]
                },
                include: this.getItineraryInclude()
            });
        } catch (error) {
            console.error("Errore recupero itinerario pubblico per ID:", error);
            throw error;
        }
    }
}
