import { Accommodation } from '../models/accommodation.model';
import { Activity } from '../models/activity.model';
import { BuilderPoi } from '../models/builder.types';

export function buildGoogleSearchQuery(poi: Pick<BuilderPoi, 'title' | 'locationName' | 'street' | 'subtitle'>): string {
  let query = (poi.title || '').trim();
  
  if (poi.locationName && !query.toLowerCase().includes(poi.locationName.toLowerCase())) {
    query += ` di ${poi.locationName.trim()}`;
  }
  
  if (poi.street) {
    const sLower = poi.street.toLowerCase().trim();
    const hasPrefix = ['via ', 'viale ', 'corso ', 'piazza ', 'piazzale ', 'vicolo ', 'strada '].some(p => sLower.startsWith(p));
    if (hasPrefix) {
      query += ` in ${poi.street.trim()}`;
    } else {
      query += ` in via ${poi.street.trim()}`;
    }
  }

  return query.trim() || 'Punto di interesse';
}

export function buildGoogleSearchUrl(poi: Pick<BuilderPoi, 'title' | 'locationName' | 'street' | 'subtitle'>): string {
  return `https://www.google.com/search?q=${encodeURIComponent(buildGoogleSearchQuery(poi))}`;
}

export type GoogleMapsPoiInput = {
  title?: string | null;
  name?: string | null;
  street?: string | null;
  locationName?: string | null;
  location?: string | null;
  subtitle?: string | null;
  categoryName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const GENERIC_MAP_CATEGORIES = new Set(['attività', 'hotel', 'categoria', 'alloggio']);

function normalizeMapPart(value?: string | null): string {
  return (value || '').trim();
}

function containsInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Query ricca per Google Maps: nome, strada, luogo e categoria quando disponibili. */
export function buildGoogleMapsSearchQuery(poi: GoogleMapsPoiInput): string {
  const name = normalizeMapPart(poi.title || poi.name);
  const street = normalizeMapPart(poi.street);
  const location = normalizeMapPart(poi.locationName || poi.location);
  const category = normalizeMapPart(poi.categoryName || poi.subtitle);

  const parts: string[] = [];
  if (name) parts.push(name);
  if (street) parts.push(street);
  if (location && !containsInsensitive(parts.join(' '), location)) {
    parts.push(location);
  }
  if (
    category &&
    !GENERIC_MAP_CATEGORIES.has(category.toLowerCase()) &&
    !containsInsensitive(parts.join(' '), category)
  ) {
    parts.push(category);
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude)) {
    return `${poi.latitude},${poi.longitude}`;
  }

  return 'Punto di interesse';
}

export function buildGoogleMapsSearchUrl(poi: GoogleMapsPoiInput): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buildGoogleMapsSearchQuery(poi))}`;
}

export function buildGoogleMapsSearchUrlFromBuilderPoi(poi: BuilderPoi): string {
  return buildGoogleMapsSearchUrl({
    title: poi.title,
    street: poi.street,
    locationName: poi.locationName,
    subtitle: poi.subtitle,
    categoryName: poi.categoryName,
    latitude: poi.latitude,
    longitude: poi.longitude,
  });
}

export function mapActivityToBuilderPoi(activity: Activity, locationName?: string): BuilderPoi {
  const categoryName = activity.category?.name;
  const description =
    activity.description?.trim() ||
    activity.category?.description?.trim() ||
    undefined;

  return {
    key: `activity-${activity.id}`,
    type: 'activity',
    entityId: activity.id,
    title: activity.name,
    subtitle: categoryName || 'Attività',
    street: activity.street || undefined,
    description,
    locationName,
    latitude: activity.latitude,
    longitude: activity.longitude,
    categoryId: activity.categoryId,
    categoryName,
    itemTypeCode: 'ACTIVITY',
    imageUrl: activity.imageUrl,
    price: activity.price,
    rating: activity.rating,
  };
}

export function mapAccommodationToBuilderPoi(acc: Accommodation, locationName?: string): BuilderPoi {
  const starsLabel = acc.stars ? `${acc.stars} stelle` : null;
  const description = starsLabel
    ? `Struttura ricettiva${locationName ? ` a ${locationName}` : ''} · ${starsLabel}.`
    : locationName
      ? `Struttura ricettiva a ${locationName}.`
      : 'Struttura ricettiva per il soggiorno.';

  return {
    key: `accommodation-${acc.id}`,
    type: 'accommodation',
    entityId: acc.id,
    title: acc.name,
    subtitle: starsLabel ? `Hotel · ${starsLabel}` : 'Hotel',
    street: acc.street || undefined,
    description,
    locationName,
    latitude: acc.latitude,
    longitude: acc.longitude,
    itemTypeCode: 'ACCOMMODATION',
    imageUrl: acc.imageUrl,
    price: acc.pricePerNight,
    rating: acc.stars,
  };
}

export function isAccommodationPoi(poi: BuilderPoi): boolean {
  return poi.type === 'accommodation' || poi.itemTypeCode === 'ACCOMMODATION';
}

export function poiStartTimeLabel(poi: BuilderPoi): string {
  return isAccommodationPoi(poi) ? 'Check-in' : 'Orario inizio';
}

export function poiEndTimeLabel(poi: BuilderPoi): string {
  return isAccommodationPoi(poi) ? 'Check-out' : 'Orario fine';
}

export function escapeHtmlForPopup(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
