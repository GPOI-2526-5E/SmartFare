export interface BaseSearchParams {
    from: string;
    to: string;
    date: string;
    passengers?: number;
}
export interface TrainSearchParams extends BaseSearchParams {
    trainType?: string; // es: "Frecciarossa", "Frecciargento", "Regionale"
    maxChanges?: number;
}
export interface FlightSearchParams extends BaseSearchParams {
    cabin?: 'economy' | 'premium' | 'business' | 'first';
    maxStops?: number;
    airline?: string;
}