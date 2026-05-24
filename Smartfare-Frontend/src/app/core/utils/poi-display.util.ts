import { Accommodation } from '../models/accommodation.model';
import { Activity } from '../models/activity.model';
import { BuilderPoi } from '../models/builder.types';

export function buildGoogleSearchQuery(poi: Pick<BuilderPoi, 'title' | 'locationName' | 'street' | 'subtitle'>): string {
  return [poi.title, poi.locationName, poi.street || poi.subtitle]
    .filter((part) => !!part && String(part).trim().length > 0)
    .join(' ')
    .trim();
}

export function buildGoogleSearchUrl(poi: Pick<BuilderPoi, 'title' | 'locationName' | 'street' | 'subtitle'>): string {
  return `https://www.google.com/search?q=${encodeURIComponent(buildGoogleSearchQuery(poi))}`;
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
