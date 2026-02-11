import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export function getModel(modelName = "gemini-2.0-flash") {
  return genAI.getGenerativeModel({ model: modelName });
}

export async function generateText(
  prompt: string,
  modelName?: string
): Promise<string> {
  const model = getModel(modelName);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateJSON<T = unknown>(
  prompt: string,
  modelName?: string
): Promise<T> {
  const text = await generateText(
    prompt + "\n\nRespond with valid JSON only, no markdown fences.",
    modelName
  );
  return JSON.parse(text) as T;
}
