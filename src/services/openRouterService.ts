import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  dangerouslyAllowBrowser: true,
});

export async function analyzeWithOpenRouter(ocrText: string) {
  if (!ocrText || !ocrText.trim()) {
    throw new Error("No OCR text was provided.");
  }

  const response = await openai.chat.completions.create({
    model: "openrouter/free",
    messages: [
      {
        role: "system",
        content: `
You are an AI assistant for MetriCheck, a packaged commodity
label inspection system.

Analyze the OCR text from an offline packaged food product label.

Do not invent missing information.

Only use information actually present in the OCR text.

Identify:
- Product name
- Brand
- Net quantity
- MRP
- Manufacturing / packing information
- Date information
- FSSAI information
- Manufacturer / packer information
- Consumer care information
- Other visible mandatory label information

Clearly identify fields that are missing or unreadable.

Return a structured analysis.
        `,
      },
      {
        role: "user",
        content: `
Analyze the following OCR text:

${ocrText}
        `,
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}