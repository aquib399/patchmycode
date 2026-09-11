import { GoogleGenAI, Schema } from "@google/genai";
import { systemInstruction } from "./prompt.js";
import { AI_CONFIG } from "@/configs/env.js";

const ai = new GoogleGenAI({ apiKey: AI_CONFIG.API_KEY });

export interface GenerateStructuredInput {
  prompt: string;
  schema?: Schema;
}

export async function generateStructuredAIResponse<T>(
  input: GenerateStructuredInput
): Promise<T> {
  // console.log("---------------------PROMPT START-----------------------------");
  // console.log("---------------------PROMPT START-----------------------------");
  // console.log("---------------------PROMPT START-----------------------------");
  // console.log(input.prompt);
  // console.log("---------------------PROMPT END-----------------------------");
  // console.log("---------------------PROMPT END-----------------------------");
  // console.log("---------------------PROMPT END-----------------------------");

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: input.prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      ...(input.schema ? { responseSchema: input.schema } : {})
    }
  });

  const rawText = response.text || "{}";
  const parsed = JSON.parse(rawText) as T;

  // console.log("---------------------OUTPUT START-----------------------------");
  // console.log("---------------------OUTPUT START-----------------------------");
  // console.log("---------------------OUTPUT START-----------------------------");
  // console.log(JSON.stringify(parsed, null, 2));
  // console.log("---------------------OUTPUT END-----------------------------");
  // console.log("---------------------OUTPUT END-----------------------------");
  // console.log("---------------------OUTPUT END-----------------------------");

  return parsed;
}
