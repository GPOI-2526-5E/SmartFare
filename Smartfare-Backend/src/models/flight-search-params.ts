export interface FlightSearchParams {
  from: string;
  to: string;
  date: string;
  passengers?: number;
  // optional cabin/class preference (economy, business, etc.)
  cabin?: string;
}
