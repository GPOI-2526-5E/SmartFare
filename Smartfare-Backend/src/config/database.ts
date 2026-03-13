import mongoose from "mongoose";
import { DatabaseConfig } from "../models/database.model";
import dotenv from "dotenv";

dotenv.config();

const getDatabaseConfig = (): DatabaseConfig => {

    const mongodbUri = process.env.MONGODB_URI;
    const mongodbDatabase = process.env.MONGODB_DATABASE || "Smartfare";

    if (!mongodbUri) {
        throw new Error("MONGODB_URI non configurato in .env");
    }

    return {
        uri: mongodbUri,
        dbName: mongodbDatabase,
        options: {
            maxPoolSize: 10,
            minPoolSize: 2,
            retryWrites: true,
            w: "majority",
            dbName: mongodbDatabase,
        },
    };
};

export async function connectDatabase(): Promise<typeof mongoose> {
    try {
        if (mongoose.connection.readyState === 1) {
            console.log("✅ Database già connesso");
            return mongoose;
        }

        const config = getDatabaseConfig();
        console.log(`🔄 Connessione a MongoDB Atlas: ${config.uri.split("@")[1]}`);

        await mongoose.connect(config.uri, config.options);

        console.log("📦 Database selezionato", { dbName: config.dbName });
        console.log("✅ Connessione a MongoDB Atlas riuscita!");

        return mongoose;
    } catch (error) {
        console.error("❌ Errore connessione database:", error);
        throw error;
    }
}

export function getDatabase() {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("Database non connesso.");
    }
    return mongoose.connection.db;
}

export async function disconnectDatabase(): Promise<void> {
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log("✅ Database disconnesso");
        }
    } catch (error) {
        console.error("❌ Errore disconnessione database:", error);
        throw error;
    }
}

export function getCollection<TSchema extends mongoose.mongo.Document = mongoose.mongo.Document>(collectionName: string): mongoose.mongo.Collection<TSchema> {
    const database = getDatabase();
    if (!database) {
        throw new Error("Database non disponibile");
    }
    return database.collection<TSchema>(collectionName);
}

export function isDatabaseConnected(): boolean {
    return mongoose.connection.readyState === 1;
}

export default {
    connectDatabase,
    getDatabase,
    disconnectDatabase,
    getCollection,
    isDatabaseConnected,
};
