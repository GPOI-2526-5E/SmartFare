export interface ActivityCategory {
  id: number;
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface Activity {
  id: number;
  name: string;
  description?: string;
  street?: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  locationId: number;
  categoryId: number;
  category?: ActivityCategory;
  price?: number;
  rating?: number;
}
