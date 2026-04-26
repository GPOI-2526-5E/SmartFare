import { ActivityCategory } from '../../../core/models/activity.model';

export type BuilderPoiType = 'accommodation' | 'activity';

export interface BuilderPoi {
    key: string;
    type: BuilderPoiType;
    entityId: number;
    title: string;
    subtitle?: string;
    latitude: number;
    longitude: number;
    categoryId?: number;
    categoryName?: string;
    itemTypeCode: 'ACCOMMODATION' | 'ACTIVITY';
    dayNumber?: number;
    note?: string;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
    imageUrl?: string;
    price?: number;
    rating?: number;
}

export interface SidebarFilterState {
    type: 'all' | 'accommodation' | 'activity';
    categoryId: number | 'all';
    categories: ActivityCategory[];
}
