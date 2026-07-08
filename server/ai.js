import OpenAI from 'openai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
// Cheapest OpenRouter vision model that handles receipt OCR well (~$0.10/M in, $0.40/M out).
// Override with OPENROUTER_MODEL if you want to experiment (e.g. google/gemma-3-27b-it is cheaper but weaker on thermal receipts).
const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';

export function isAiConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://receipt-tracker.onrender.com',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'Receipt Tracker',
    },
  });
}

export function getReceiptModel() {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

export const RECEIPT_PARSE_PROMPT = `Extract receipt information from this image. Return ONLY valid JSON with these fields:
{
  "merchant": "store/restaurant name (e.g. Esso Circle K, not the address)",
  "date": "YYYY-MM-DD",
  "time": "HH:MM in 24h format",
  "amount": 0.00,
  "lineItem": "one of: Parking, Gas, Toll, Transit, Meals, Lodging, Office Supplies, Other",
  "description": "brief description of purchase",
  "confidence": 0.0 to 1.0
}

Rules:
- amount must be the final total paid (e.g. "TOTAL CAD $ 31.18" -> 31.18)
- lineItem defaults to Parking unless clearly something else
- Gas/fuel receipts (Esso, Circle K, Petro-Canada, Shell, pump, litre/liter) -> Gas
- Parking garages, meters, impark, indigo -> Parking
- Tolls, 407, E-ZPass -> Toll
- Uber, Lyft, taxi, transit -> Transit
- Restaurants and food -> Meals
- Parse labeled fields like DATE: and TIME: when present
- Canadian receipts may show CAD, HST, GST — still use the total purchase amount
- Use null for fields you cannot determine`;

export async function parseReceiptWithAi(base64, mimeType = 'jpeg') {
  const client = getOpenRouterClient();
  if (!client) {
    throw new Error('AI parsing not configured. Set OPENROUTER_API_KEY.');
  }

  const response = await client.chat.completions.create({
    model: getReceiptModel(),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: RECEIPT_PARSE_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:image/${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    const err = new Error('Could not parse AI response');
    err.raw = content;
    throw err;
  }

  return JSON.parse(jsonMatch[0]);
}
