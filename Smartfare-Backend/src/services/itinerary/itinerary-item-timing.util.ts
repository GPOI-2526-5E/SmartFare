/**
 * Quando una tappa ha groupName, gli orari devono stare a livello gruppo
 * (groupStartAt / groupEndAt), non sulla singola attività.
 */
export type TimedItineraryItem = {
    itemTypeCode: string;
    dayNumber: number;
    orderInt: number;
    note: string | null;
    groupName: string | null;
    activityId: number | null;
    accommodationId: number | null;
    plannedStartAt?: string | Date | null;
    plannedEndAt?: string | Date | null;
    groupStartAt?: string | Date | null;
    groupEndAt?: string | Date | null;
};

function toIsoString(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function applyGroupLevelTiming<T extends TimedItineraryItem>(items: T[]): T[] {
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
            .sort((left, right) => (left.item.orderInt ?? 0) - (right.item.orderInt ?? 0));

        let groupStart: string | null = null;
        let groupEnd: string | null = null;

        for (const { item } of members) {
            if (!groupStart) {
                groupStart = toIsoString(item.groupStartAt) ?? toIsoString(item.plannedStartAt);
            }
            if (!groupEnd) {
                groupEnd = toIsoString(item.groupEndAt) ?? toIsoString(item.plannedEndAt);
            }
        }

        if (!groupStart && !groupEnd) continue;

        for (const { index } of members) {
            result[index] = {
                ...result[index],
                groupStartAt: groupStart as T['groupStartAt'],
                groupEndAt: groupEnd as T['groupEndAt'],
                plannedStartAt: null as T['plannedStartAt'],
                plannedEndAt: null as T['plannedEndAt'],
            };
        }
    }

    return result;
}
