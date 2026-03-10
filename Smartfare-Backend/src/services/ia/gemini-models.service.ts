import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";
export const genAI = new GoogleGenerativeAI(API_KEY);

export const GEMINI_MODELS = (process.env.GEMINI_MODEL || "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.startsWith("gemini-"));

export function getModel(modelName: string) {
    return genAI.getGenerativeModel({ model: modelName });
}

export async function generateWithFallback(prompt: string) {
    let lastError: unknown;

    for (const model of GEMINI_MODELS) {
        try {
            const result = await getModel(model).generateContent(prompt);
            return result.response;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}
