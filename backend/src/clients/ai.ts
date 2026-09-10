import { GoogleGenAI, Schema } from "@google/genai";
import { AI_CONFIG } from "@/configs/env.js";

const ai = new GoogleGenAI({ apiKey: AI_CONFIG.API_KEY });

export interface GenerateStructuredInput {
  systemInstruction?: string;
  prompt: string;
  schema?: Schema;
}

export async function generateStructuredAIResponse<T>(
  input: GenerateStructuredInput
): Promise<T> {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: input.prompt,
    config: {
      systemInstruction: input.systemInstruction,
      responseMimeType: "application/json",
      ...(input.schema ? { responseSchema: input.schema } : {})
    }
  });

  const rawText = response.text || "{}";
  return JSON.parse(rawText) as T;
}
