/**
 * Parametri di ricerca comuni per treni e voli
 */
export interface BaseSearchParams {
    from: string;
    to: string;
    date: string;
    passengers?: number;
}

/**
 * Parametri di ricerca specifici per i treni
 */
export interface TrainSearchParams extends BaseSearchParams {
    trainType?: string; // es: "Frecciarossa", "Frecciargento", "Regionale"
    maxChanges?: number;
}

/**
 * Parametri di ricerca specifici per i voli
 */
export interface FlightSearchParams extends BaseSearchParams {
    cabin?: 'economy' | 'premium' | 'business' | 'first';
    maxStops?: number;
    airline?: string;
}

/**
 * Parametri di ricerca unificati (per ricerche combinate)
 */
export interface SearchParams extends BaseSearchParams {
    type?: 'train' | 'flight' | 'both';
    trainType?: string;
    maxChanges?: number;
    cabin?: string;
    maxStops?: number;
    airline?: string;
}
