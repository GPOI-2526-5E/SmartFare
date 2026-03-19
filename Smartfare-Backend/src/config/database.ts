import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DatabaseConfig } from "../models/database.model";
import dotenv from "dotenv";

dotenv.config();

const getDatabaseConfig = (): DatabaseConfig => {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        throw new Error("SUPABASE_URL non configurato in .env");
    }

    if (!serviceRoleKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY non configurato in .env");
    }

    return { url, serviceRoleKey };
};

let supabaseClient: SupabaseClient | null = null;

export async function connectDatabase(): Promise<SupabaseClient> {
    try {
        if (supabaseClient) {
            console.log("✅ Database già connesso");
            return supabaseClient;
        }

        const config = getDatabaseConfig();
        console.log("🔄 Connessione a Supabase");

        supabaseClient = createClient(config.url, config.serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        console.log("✅ Connessione a Supabase riuscita!");

        return supabaseClient;
    } catch (error) {
        console.error("❌ Errore connessione database:", error);
        throw error;
    }
}

export function getSupabaseClient(): SupabaseClient {
    if (!supabaseClient) {
        throw new Error("Database non connesso.");
    }
    return supabaseClient;
}

export async function disconnectDatabase(): Promise<void> {
    try {
        if (supabaseClient) {
            supabaseClient = null;
            console.log("✅ Database disconnesso");
        }
    } catch (error) {
        console.error("❌ Errore disconnessione database:", error);
        throw error;
    }
}

export function isDatabaseConnected(): boolean {
    return supabaseClient !== null;
}

export default {
    connectDatabase,
    getSupabaseClient,
    disconnectDatabase,
    isDatabaseConnected,
};
