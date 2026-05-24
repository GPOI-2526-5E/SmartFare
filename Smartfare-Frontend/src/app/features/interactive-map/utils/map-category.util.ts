export function categoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('muse') || n.includes('monument') || n.includes('storico')) return 'bi-bank';
  if (n.includes('food') || n.includes('risto') || n.includes('cucina') || n.includes('bar')) return 'bi-cup-hot';
  if (n.includes('night') || n.includes('club')) return 'bi-moon-stars';
  if (n.includes('park') || n.includes('parco') || n.includes('nature')) return 'bi-tree';
  if (n.includes('shop') || n.includes('negozi')) return 'bi-bag';
  if (n.includes('sport') || n.includes('fitness')) return 'bi-trophy';
  if (n.includes('spa') || n.includes('wellness')) return 'bi-flower2';
  if (n.includes('arte') || n.includes('galler')) return 'bi-palette';
  if (n.includes('beach') || n.includes('spiaggia')) return 'bi-water';
  if (n.includes('chies') || n.includes('cattedral')) return 'bi-bell';
  return 'bi-geo-alt-fill';
}

export function categoryVisuals(
  categoryName?: string,
  kind: 'hotel' | 'activity' = 'activity'
): { icon: string; color: string } {
  if (kind === 'hotel') return { icon: 'bi-building', color: '#8b5cf6' };
  if (!categoryName) return { icon: 'bi-geo-alt-fill', color: '#64748b' };

  const n = categoryName.toLowerCase();
  if (n.includes('muse') || n.includes('monument') || n.includes('storico')) return { icon: 'bi-bank', color: '#f59e0b' };
  if (n.includes('food') || n.includes('risto') || n.includes('cucina') || n.includes('bar')) return { icon: 'bi-cup-hot', color: '#ef4444' };
  if (n.includes('night') || n.includes('club')) return { icon: 'bi-moon-stars', color: '#8b5cf6' };
  if (n.includes('park') || n.includes('parco') || n.includes('nature')) return { icon: 'bi-tree', color: '#22c55e' };
  if (n.includes('shop') || n.includes('negozi')) return { icon: 'bi-bag', color: '#ec4899' };
  if (n.includes('sport') || n.includes('fitness')) return { icon: 'bi-trophy', color: '#f97316' };
  if (n.includes('spa') || n.includes('wellness')) return { icon: 'bi-flower2', color: '#06b6d4' };
  if (n.includes('arte') || n.includes('galler')) return { icon: 'bi-palette', color: '#d946ef' };
  if (n.includes('beach') || n.includes('spiaggia')) return { icon: 'bi-water', color: '#0ea5e9' };
  if (n.includes('chies') || n.includes('cattedral')) return { icon: 'bi-bell', color: '#a855f7' };
  return { icon: 'bi-geo-alt-fill', color: '#10b981' };
}
