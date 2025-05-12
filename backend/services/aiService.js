import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
});

export const generateSegmentQuery = async (prompt) => {
  const today = new Date().toISOString().split('T')[0]; 
const fullPrompt = `Convert the following customer segmentation criteria into a valid MongoDB filter object.
ONLY return a raw, valid JSON object with no explanation or formatting.
DO NOT use code blocks or markdown.
DO NOT use JavaScript functions like new Date().
Use ISO date strings for Date comparisons (e.g., "YYYY-MM-DD").
Today's date is ${today}.

Only use these fields:
- totalSpend (Number)
- totalOrders (Number)
- lastOrderDate (Date)
- createdAt (Date)

Do NOT include any other fields such as name, email, phone, dates, etc.

Criteria:
${prompt}
`.trim();

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash-8b",
    contents: [
      {
        role: "user",
        parts: [{ text: fullPrompt }],
      },
    ],
  });

  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  const cleanJsonText = text
    .replace(/^```(?:json)?\s*/i, '') 
    .replace(/\s*```$/, '');

  try {
    const json = JSON.parse(cleanJsonText);
    const allowedFields = ['totalSpend', 'totalOrders', 'lastOrderDate', 'createdAt'];
    const keys = Object.keys(json);
    const invalidKeys = keys.filter(k => !allowedFields.includes(k));
    if (invalidKeys.length > 0) {
      throw new Error(`Invalid fields detected in filter: ${invalidKeys.join(', ')}`);
    }
    return json;
  } catch {
    throw new Error(`Failed to parse AI response as JSON:\n${text}`);
  }
};

export const suggestMessages = async (context) => {
  const fullPrompt = `Write one concise marketing message tailored for the following customer segment or goal.
  Do not include any explanation or formatting—just a plain, short sentence in about 10-12 words.
  
  Context:
  ${context}
`.trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: fullPrompt }],
      },
    ],
  });

  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return text.trim();
};
