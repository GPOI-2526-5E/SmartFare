export type PreviewStop = {
  key: string;
  order: number;
  dayNumber: number;
  title: string;
  locationLine: string;
  categoryLabel: string;
  note: string | null;
  timeRange: string | null;
  type: 'activity' | 'accommodation';
  imageUrl: string | null;
  mapsUrl: string | null;
  iconClass: string;
};

export type PreviewDay = {
  dayNumber: number;
  title: string;
  dateLabel: string;
  stops: PreviewStop[];
};
