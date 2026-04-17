import prisma from "../../../lib/prisma";
import { TrainSearchParams } from "../../../models/search-params.model";
import { TrainSearchOffer, TrainSearchResult } from "../types/train-ai.types";
import Utilites from "../utils/trains-search.utils";

export async function searchTrainOffers(params: TrainSearchParams): Promise<TrainSearchResult> {
    console.log("[TRAINS][SEARCH] Parametri ricevuti:", params);
    
    const dayStart = new Date(`${params.date}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // 1. Query for Train Offers using Prisma with relations
    // In the new schema, we query trainRouteSegments to find the right path
    const routeSegments = await prisma.trainRouteSegment.findMany({
        where: {
            originId: params.originStationId,
            arrivalStationId: params.destinationStationId,
            departureTime: {
                gte: dayStart,
                lt: dayEnd
            }
        },
        include: {
            offer: true,
            originStation: {
                include: { location: true }
            },
            arrivalStation: {
                include: { location: true }
            }
        },
        orderBy: {
            departureTime: 'asc'
        }
    });

    console.log("[TRAINS][SEARCH] Record caricati dal DB:", routeSegments.length);

    const filteredOffers = routeSegments
        .map((segment: any): TrainSearchOffer | null => {
            const offer = segment.offer;
            const originStation = segment.originStation;
            const destinationStation = segment.arrivalStation;
            const originLocation = originStation.location;
            const destinationLocation = destinationStation.location;

            const departure = Utilites.buildStationLabel(originStation as any, originLocation as any);
            const arrival = Utilites.buildStationLabel(destinationStation as any, destinationLocation as any);
            
            const depTime = segment.departureTime.toISOString();
            const arrTime = segment.arrivalTime.toISOString();
            
            const departureParts = Utilites.toDateParts(depTime);
            const arrivalParts = Utilites.toDateParts(arrTime);
            
            // For now, since changes weren't explicitly in the schema for segments, we use 0 or calculate if needed
            const changes = 0; 

            return {
                trainOfferId: offer.offerId,
                routeKey: Utilites.buildRouteKey(departure, arrival, departureParts.date, departureParts.time, segment.trainId),
                trainId: segment.trainId,
                company: `Treno ${segment.trainId}`,
                trainType: "Diretto",
                departure,
                arrival,
                departureDate: departureParts.date,
                departureTime: departureParts.time,
                arrivalTime: arrivalParts.time,
                duration: Utilites.formatDuration(depTime, arrTime),
                changes,
                price: Number(offer.price ?? 0),
                availability: (offer.availableSeat ?? 0) <= 0
                    ? "esaurito"
                    : "disponibile",
            };
        })
        .filter((offer: TrainSearchOffer | null): offer is TrainSearchOffer => offer !== null)
        .sort((first: TrainSearchOffer, second: TrainSearchOffer) => first.price - second.price);

    console.log("[TRAINS][SEARCH] Offerte finali dopo tutti i filtri:", filteredOffers.length);

    return {
        filters: params,
        offers: filteredOffers,
        searchedAt: new Date(),
        total: filteredOffers.length,
    };
}

