import { Accommodation } from './accommodation.model';
import { Activity, ActivityCategory } from './activity.model';
import Location from './location.model';

export interface Itinerary {
    id?: number;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    locationId?: number | null;
    location?: Location | null;
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
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
    activity?: Activity;
    accommodation?: Accommodation;
}

export interface ItineraryWorkspace {
    location: Location | null;
    accommodations: Accommodation[];
    activities: Activity[];
    categories: ActivityCategory[];
    draft: Itinerary | null;
}
