import { ItineraryItem } from '../models/itinerary.model';

/** Allinea gli orari al gruppo quando groupName è presente. */
export function applyGroupLevelTimingToItems(items: ItineraryItem[]): ItineraryItem[] {
  if (!items?.length) return items;

  const result = items.map((item) => ({ ...item }));
  const groups = new Map<string, number[]>();

  result.forEach((item, index) => {
    const name = item.groupName?.trim();
    if (!name) return;
    const key = `${item.dayNumber ?? 1}::${name}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(index);
  });

  for (const indices of groups.values()) {
    const members = indices
      .map((index) => ({ index, item: result[index] }))
      .sort((a, b) => (a.item.orderInt ?? 0) - (b.item.orderInt ?? 0));

    let groupStart: string | null = null;
    let groupEnd: string | null = null;

    for (const { item } of members) {
      if (!groupStart) groupStart = item.groupStartAt ?? item.plannedStartAt ?? null;
      if (!groupEnd) groupEnd = item.groupEndAt ?? item.plannedEndAt ?? null;
    }

    if (!groupStart && !groupEnd) continue;

    for (const { index } of members) {
      result[index] = {
        ...result[index],
        groupStartAt: groupStart,
        groupEndAt: groupEnd,
        plannedStartAt: null,
        plannedEndAt: null,
      };
    }
  }

  return result;
}
