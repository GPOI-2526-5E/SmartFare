export interface Itinerary {
    id?: number;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    userId?: number;
    items?: ItineraryItem[];
    updatedAt?: string;
}

export interface ItineraryItem {
    id?: number;
    dayNumber: number;
    orderInt: number;
    title?: string;
    note?: string;
    itemTypeCode: string;
    activityId?: number;
    accommodationId?: number;
}
