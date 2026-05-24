export type MapMarkerKind = 'hotel' | 'activity';

export interface MapMarker {
  key: string;
  id: number;
  kind: MapMarkerKind;
  name: string;
  street?: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  categoryId?: number;
  categoryName?: string;
  rating?: number;
}

export type MapCategoryFilter = 'all' | 'hotel' | number;

export interface MapCategoryOption {
  id: number;
  name: string;
  icon: string;
}
