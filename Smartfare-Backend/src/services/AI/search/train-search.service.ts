import { getSupabaseClient } from "../../../config/database";
import { Location as DbLocation, StationRecord, TrainOfferRecord } from "../../../models/database.model";
import { TrainSearchParams } from "../../../models/search-params.model";
import { TrainSearchOffer, TrainSearchResult } from "../types/train-ai.types";
import Utilites from "../utils/trains-search.utils";


export async function searchTrainOffers(params: TrainSearchParams): Promise<TrainSearchResult> {
    const supabase = getSupabaseClient();
    console.log("[TRAINS][SEARCH] Parametri ricevuti:", params);
    const dayStart = `${params.date}T00:00:00`;
    const dayEndDate = new Date(`${params.date}T00:00:00`);
    dayEndDate.setDate(dayEndDate.getDate() + 1);
    const dayEnd = dayEndDate.toISOString().slice(0, 19);

    const [{ data: offersData, error: offersError }, { data: stationsData, error: stationsError }] = await Promise.all([
        supabase
            .from("train_offers")
            .select("*")
            .eq("origin_station_id", params.originStationId)
            .eq("destination_station_id", params.destinationStationId)
            .gte("departure_time", dayStart)
            .lt("departure_time", dayEnd)
            .order("departure_time", { ascending: true }),
        // Carichiamo solo le due stazioni coinvolte nella ricerca:
        // cosi' evitiamo il limite implicito dei 1000 record.
        supabase
            .from("stations")
            .select("*")
            .in("id", [params.originStationId, params.destinationStationId]),
    ]);

    if (offersError) {
        throw offersError;
    }

    if (stationsError) {
        throw stationsError;
    }

    const offers = (offersData ?? []) as TrainOfferRecord[];
    const stations = (stationsData ?? []) as StationRecord[];
    console.log("[TRAINS][SEARCH] Record caricati dal DB:", {
        offers: offers.length,
        stations: stations.length,
    });

    const stationsById = new Map<number, StationRecord>(stations.map((station) => [station.id, station]));
    const locationIds = Array.from(
        new Set(
            stations
                .map((station) => station.location_id)
                .filter((locationId): locationId is number => typeof locationId === "number")
        )
    );
    const { data: locationsData, error: locationsError } = await supabase
        .from("locations")
        .select("*")
        .in("id", locationIds);

    if (locationsError) {
        throw locationsError;
    }

    const locations = (locationsData ?? []) as DbLocation[];
    const locationsById = new Map<number, DbLocation>(locations.map((location) => [location.id, location]));

    console.log("[TRAINS][SEARCH] Conteggi filtri:", {
        byOrigin: offers.length,
        byDestination: offers.length,
        byBothStations: offers.length,
        byDate: offers.length,
    });

    if (offers.length > 0) {
        console.log(
            "[TRAINS][SEARCH] Esempi offerte stessa tratta:",
            offers.slice(0, 5).map((offer) => ({
                id: offer.id,
                departure_time: offer.departure_time,
                arrival_time: offer.arrival_time,
                price: offer.price,
                available_seats: offer.available_seats,
            }))
        );
    }

    const filteredOffers = offers
        .map((offer): TrainSearchOffer | null => {
            const originStation = stationsById.get(offer.origin_station_id);
            const destinationStation = stationsById.get(offer.destination_station_id);
            const originLocation = originStation?.location_id ? locationsById.get(originStation.location_id) : undefined;
            const destinationLocation = destinationStation?.location_id ? locationsById.get(destinationStation.location_id) : undefined;
            const departure = Utilites.buildStationLabel(originStation, originLocation);
            const arrival = Utilites.buildStationLabel(destinationStation, destinationLocation);
            const departureParts = Utilites.toDateParts(offer.departure_time);
            const arrivalParts = Utilites.toDateParts(offer.arrival_time);
            const changes = typeof offer.changes === "number" ? offer.changes : 0;

            return {
                trainOfferId: offer.id,
                routeKey: Utilites.buildRouteKey(departure, arrival, departureParts.date, departureParts.time, offer.train_id),
                trainId: offer.train_id,
                company: offer.train_id ? `Treno ${offer.train_id}` : "Treno disponibile",
                trainType: changes > 0 ? "Con cambio" : "Diretto",
                departure,
                arrival,
                departureDate: departureParts.date,
                departureTime: departureParts.time,
                arrivalTime: arrivalParts.time,
                duration: Utilites.formatDuration(offer.departure_time, offer.arrival_time),
                changes,
                price: Number(offer.price ?? 0),
                availability: typeof offer.available_seats === "number" && offer.available_seats <= 0
                    ? "esaurito"
                    : "disponibile",
            };
        })
        .filter((offer): offer is TrainSearchOffer => offer !== null)
        .sort((first, second) => first.price - second.price);

    console.log("[TRAINS][SEARCH] Offerte finali dopo tutti i filtri:", filteredOffers.length);

    return {
        filters: params,
        offers: filteredOffers,
        searchedAt: new Date(),
        total: filteredOffers.length,
    };
}
