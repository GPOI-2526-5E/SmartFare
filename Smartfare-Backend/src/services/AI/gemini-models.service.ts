import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";
export const genAI = new GoogleGenerativeAI(API_KEY);
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 12000);

export const GEMINI_MODELS = (process.env.GEMINI_MODEL || "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.startsWith("gemini-"));

export function getModel(modelName: string) {
    return genAI.getGenerativeModel({ model: modelName });
}

export async function generateWithFallback(prompt: string) {
    if (!API_KEY) {
        throw new Error("GEMINI_API_KEY non configurata");
    }

    if (GEMINI_MODELS.length === 0) {
        throw new Error("Nessun modello Gemini configurato in GEMINI_MODEL");
    }

    let lastError: unknown;

    for (const model of GEMINI_MODELS) {
        try {
            const result = await Promise.race([
                getModel(model).generateContent(prompt),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout Gemini dopo ${GEMINI_TIMEOUT_MS}ms sul modello ${model}`)), GEMINI_TIMEOUT_MS)
                ),
            ]);
            return result.response;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}
