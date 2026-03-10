import mongoose, { Schema } from "mongoose";

export interface DatabaseConfig {
    uri: string;
    dbName: string;
    options: any;
}

export interface FlightOffer {
    airline: string;
    departureDate: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: number;
    previousPrice?: number;
    priceTrend?: string;
    stops: number;
    cabin?: string;
    availability: string;
    link?: string;
    departure: string;
    arrival: string;
}

export interface TrainOffer {
    company: string;
    departureDate: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: number;
    previousPrice?: number;
    priceTrend?: string;
    trainType: string;
    changes: number;
    availability: string;
    link?: string;
    departure: string;
    arrival: string;
}

// Schema per Train (Collection: Trains)
const TrainSchema = new Schema(
    {
        company: { type: String, required: true },
        departure: { type: String, required: true },
        arrival: { type: String, required: true },
        departureDate: { type: String, required: true },
        departureTime: { type: String, required: true },
        arrivalTime: { type: String, required: true },
        duration: { type: String, required: true },
        price: { type: Number, required: true },
        previousPrice: { type: Number },
        priceTrend: { type: String },
        trainType: { type: String, required: true },
        changes: { type: Number, required: true },
        availability: { type: String, required: true },
        link: { type: String },
    },
    {
        collection: "Trains",
        timestamps: true,
    }
);

// Schema per Flight (Collection: Flights)
const FlightSchema = new Schema(
    {
        airline: { type: String, required: true },
        flightNumber: { type: String, required: true },
        departure: { type: String, required: true },
        arrival: { type: String, required: true },
        departureDate: { type: String, required: true },
        departureTime: { type: String, required: true },
        arrivalTime: { type: String, required: true },
        duration: { type: String, required: true },
        price: { type: Number, required: true },
        previousPrice: { type: Number },
        priceTrend: { type: String },
        stops: { type: Number, required: true },
        cabin: { type: String },
        availability: { type: String, required: true },
        link: { type: String },
    },
    {
        collection: "Flights",
        timestamps: true,
    }
);

// Modelli
export const Train = mongoose.model("Train", TrainSchema);
export const Flight = mongoose.model("Flight", FlightSchema);
