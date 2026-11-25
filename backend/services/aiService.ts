import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let ai: GoogleGenAI | undefined;

/**
 * Model identifiers move. When a model is retired the API answers with a
 * 404 that names the replacement, so the request is retried against the next
 * candidate instead of failing the whole request.
 */
const MODEL_CANDIDATES = [
  env.GEMINI_MODEL || 'gemini-3.8-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-8b',
];

const isModelUnavailable = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /no longer available|not found|404/i.test(message);
};

/**
 * The model call is bounded. Without a timeout the HTTP request hung for as
 * long as the provider took, and the timer was never cleared, so every call
 * left a dangling timer behind.
 */
const AI_TIMEOUT_MS = 30_000;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs = AI_TIMEOUT_MS): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('AI request timeout')), timeoutMs);
    });
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const generateContent = async (contents: any, generationConfig?: any): Promise<any> => {
  if (!env.GOOGLE_GEMINI_API_KEY) throw new Error('AI service is not configured');
  ai ??= new GoogleGenAI({ apiKey: env.GOOGLE_GEMINI_API_KEY });
  let lastError: unknown;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response: any = await withTimeout(
        (ai.models as any).generateContent({
          model,
          contents,
          ...(generationConfig ? { config: generationConfig } : {}),
        })
      );
      return response;
    } catch (error) {
      lastError = error;
      if (!isModelUnavailable(error)) throw error;
      logger.warn('Gemini model unavailable, trying the next candidate', {
        model,
        service: 'aiService',
      });
    }
  }

  throw lastError;
};

export const generateSegmentQuery = async (prompt: string): Promise<Record<string, any>> => {
  const today = new Date().toISOString().split('T')[0];
  const fullPrompt = `Convert the following customer segmentation criteria into a valid JSON filter object.
  ONLY return a raw, valid JSON object with no explanation or formatting.
  DO NOT use code blocks or markdown.
  DO NOT use JavaScript functions like new Date().
  Use ISO date strings (YYYY-MM-DD) for date comparisons.
  Today's date is ${today}.

  Use exactly this shape:
  {
    "<field>": { "<operator>": <value> }
  }

  Allowed fields:
  - name (String)
  - email (String)
  - phone (String)
  - position (String)
  - totalSpend (Number)
  - totalOrders (Number)
  - lastOrderDate (Date)
  - createdAt (Date)

  Allowed operators: gt, gte, lt, lte, eq, ne, in, nin, exists
  Do NOT prefix operators with a dollar sign. "gte" not "$gte".
  Do NOT include any other fields.

  Criteria:
  ${prompt}
  `.trim();

  const response: any = await generateContent([
    {
      role: 'user',
      parts: [{ text: fullPrompt }],
    },
  ]);

  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const cleanJsonText = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    const json = JSON.parse(cleanJsonText);
    const allowedFields = [
      'name',
      'email',
      'phone',
      'position',
      'totalSpend',
      'totalOrders',
      'lastOrderDate',
      'createdAt',
    ];
    const allowedOperators = ['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'in', 'nin', 'exists'];

    const keys = Object.keys(json);
    const invalidKeys = keys.filter((key) => !allowedFields.includes(key));
    if (invalidKeys.length > 0) {
      throw new Error(`Invalid fields detected in filter: ${invalidKeys.join(', ')}`);
    }

    /**
     * The operator keys are validated too. Only the top level field names
     * were checked before, so an operator like `$where` would have passed
     * this validation and reached the query builder.
     */
    for (const key of keys) {
      const conditions = json[key];
      if (typeof conditions !== 'object' || conditions === null) {
        throw new Error(`Invalid filter for "${key}"`);
      }
      const invalidOperators = Object.keys(conditions).filter(
        (operator) => !allowedOperators.includes(operator.replace(/^\$/, ''))
      );
      if (invalidOperators.length > 0) {
        throw new Error(
          `Invalid operators detected in filter for "${key}": ${invalidOperators.join(', ')}`
        );
      }
    }

    return json;
  } catch {
    throw new Error(`Failed to parse AI response as JSON:\n${text}`);
  }
};

export const suggestMessages = async (context: string): Promise<string> => {
  const fullPrompt = `Write one concise marketing message tailored for the following customer segment or goal.
  Do not include any explanation or formatting—just a plain, short sentence in about 10-12 words.

  Context:
  ${context}
`.trim();

  const response: any = await generateContent([
    {
      role: 'user',
      parts: [{ text: fullPrompt }],
    },
  ]);

  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return text.trim();
};

export const generateGrowthInsights = async (
  customers: any[],
  orders: any[],
  campaigns: any[],
  logs: any[]
): Promise<string[]> => {
  try {
    if (
      !Array.isArray(customers) ||
      !Array.isArray(orders) ||
      !Array.isArray(campaigns) ||
      !Array.isArray(logs)
    ) {
      throw new Error('Invalid input data: All parameters must be arrays');
    }

    /**
     * The sample is randomised. Taking the first N records meant the same
     * oldest contacts were sent on every request.
     */
    const shuffled = <T>(items: T[]): T[] =>
      [...items].sort(() => Math.random() - 0.5);

    const getSampleSize = (length: number): number => {
      if (length === 0) return 0;
      if (length <= 5) return length;
      if (length <= 50) return Math.min(10, length);
      return Math.min(20, Math.ceil(length * 0.2));
    };

    const sampleCustomers = shuffled(customers).slice(0, getSampleSize(customers.length));
    const sampleOrders = shuffled(orders).slice(0, getSampleSize(orders.length));
    const sampleCampaigns = shuffled(campaigns).slice(0, getSampleSize(campaigns.length));
    const sampleLogs = shuffled(logs).slice(0, getSampleSize(logs.length));

    const businessContext = {
      customerCount: customers.length,
      orderCount: orders.length,
      campaignCount: campaigns.length,
      logCount: logs.length,
      hasRecentActivity: logs.some((log) => {
        const logDate = new Date(log.createdAt || log.date);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return logDate > thirtyDaysAgo;
      }),
    };

    /**
     * Only the fields that are actually needed are sent.
     *
     * The previous implementation removed a short deny list of fields, so a
     * contact's name, job title, arbitrary custom fields and free text score
     * reasons were transmitted to the model. An allow list cannot leak a
     * field that is added to the schema later.
     */
    const ALLOWED_FIELDS: Record<string, string[]> = {
      customers: ['totalSpend', 'totalOrders', 'lastOrderDate', 'status', 'temperature', 'source', 'leadScore'],
      orders: ['amount', 'orderDate'],
      campaigns: ['name', 'status', 'audienceSize'],
      logs: ['status', 'channel', 'createdAt'],
    };

    const sanitizeData = (data: any[], allowed: string[]) => {
      return data.map((item) => {
        const sanitized: Record<string, any> = {};
        for (const field of allowed) {
          if (field in item) sanitized[field] = item[field];
        }
        return sanitized;
      });
    };


    const prompt = `
You are a CRM growth consultant analyzing business data for actionable insights.

Business Overview:
- Total customers: ${businessContext.customerCount}
- Total orders: ${businessContext.orderCount}
- Marketing campaigns: ${businessContext.campaignCount}
- Communication logs: ${businessContext.logCount}
- Recent activity: ${businessContext.hasRecentActivity ? 'Yes' : 'No'}

Based on this sample data, provide exactly 3 specific, actionable business growth tips.
Focus on practical strategies for customer retention, engagement, and revenue growth.

Requirements:
- Each tip should be specific and actionable
- Use simple, clear language
- No explanations or headings
- Return only the 3 tips as clean bullet points
- Each tip should be 1-2 sentences maximum

Sample Data:
Customers: ${JSON.stringify(sanitizeData(sampleCustomers, ALLOWED_FIELDS.customers))}
Orders: ${JSON.stringify(sanitizeData(sampleOrders, ALLOWED_FIELDS.orders))}
Campaigns: ${JSON.stringify(sanitizeData(sampleCampaigns, ALLOWED_FIELDS.campaigns))}
Logs: ${JSON.stringify(sanitizeData(sampleLogs, ALLOWED_FIELDS.logs))}
`.trim();

    const response = await generateContent(
      [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      {
        maxOutputTokens: 500,
        temperature: 0.7,
      }
    );

    if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid AI response structure');
    }

    const text = response.candidates[0].content.parts[0].text;

    const insights = text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .map((line: string) => {
        return line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      })
      .filter((line: string) => line.length > 10)
      .slice(0, 3);

    if (insights.length === 0) {
      throw new Error('No valid insights generated from AI response');
    }

    const fallbackInsights = [
      'Reach out to customers who have not purchased recently with a personalized offer',
      'Analyze your most successful campaigns and replicate their key elements',
      'Set up automated follow-up sequences for new customers to improve retention',
    ];

    // Bounded fill: the previous `while (insights.length < 3)` loop never
    // terminated when a fallback line was already present.
    for (const fallback of fallbackInsights) {
      if (insights.length >= 3) break;
      if (!insights.includes(fallback)) {
        insights.push(fallback);
      }
    }

    return insights.slice(0, 3);
  } catch (error) {
    logger.error('Generate Growth Insights Error', {
      error: error instanceof Error ? error.message : 'Unknown AI error',
      stack: error instanceof Error ? error.stack : undefined,
      service: 'aiService',
    });

    return [
      'Focus on re-engaging your most valuable customers with personalized outreach',
      'Analyze customer purchase patterns to identify upselling opportunities',
      'Implement a customer feedback system to improve retention and satisfaction',
    ];
  }
};

export default { generateSegmentQuery, suggestMessages, generateGrowthInsights };
