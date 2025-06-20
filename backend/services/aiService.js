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

export const generateGrowthInsights = async (customers, orders, campaigns, logs) => {
  try {
    // Validate inputs
    if (!Array.isArray(customers) || !Array.isArray(orders) || 
        !Array.isArray(campaigns) || !Array.isArray(logs)) {
      throw new Error('Invalid input data: All parameters must be arrays');
    }

    // Intelligent sampling based on data volume
    const getSampleSize = (length) => {
      if (length === 0) return 0;
      if (length <= 5) return length;
      if (length <= 50) return Math.min(10, length);
      return Math.min(20, Math.ceil(length * 0.2)); // 20% sample for large datasets
    };

    const sampleCustomers = customers.slice(0, getSampleSize(customers.length));
    const sampleOrders = orders.slice(0, getSampleSize(orders.length));
    const sampleCampaigns = campaigns.slice(0, getSampleSize(campaigns.length));
    const sampleLogs = logs.slice(0, getSampleSize(logs.length));

    // Create business context summary
    const businessContext = {
      customerCount: customers.length,
      orderCount: orders.length,
      campaignCount: campaigns.length,
      logCount: logs.length,
      hasRecentActivity: logs.some(log => {
        const logDate = new Date(log.createdAt || log.date);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return logDate > thirtyDaysAgo;
      })
    };

    // Sanitize data to remove sensitive information
    const sanitizeData = (data) => {
      return data.map(item => {
        const sanitized = { ...item };
        // Remove potentially sensitive fields
        delete sanitized.email;
        delete sanitized.phone;
        delete sanitized.address;
        delete sanitized.paymentInfo;
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
Customers: ${JSON.stringify(sanitizeData(sampleCustomers))}
Orders: ${JSON.stringify(sanitizeData(sampleOrders))}
Campaigns: ${JSON.stringify(sanitizeData(sampleCampaigns))}
Logs: ${JSON.stringify(sanitizeData(sampleLogs))}
`.trim();

    // Add timeout for AI request
    const AI_TIMEOUT = 30000; // 30 seconds
    const aiPromise = ai.models.generateContent({
      model: "gemini-1.5-flash-8b",
      contents: [{
        role: "user",
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI request timeout')), AI_TIMEOUT);
    });

    const response = await Promise.race([aiPromise, timeoutPromise]);

    if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid AI response structure');
    }

    const text = response.candidates[0].content.parts[0].text;

    // More robust text processing
    const insights = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Remove various bullet point formats
        return line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      })
      .filter(line => line.length > 10) // Filter out very short lines
      .slice(0, 3); // Ensure exactly 3 insights

    // Validate we have quality insights
    if (insights.length === 0) {
      throw new Error("No valid insights generated from AI response");
    }

    // Pad with fallback insights if needed
    const fallbackInsights = [
      "Reach out to customers who haven't purchased recently with a personalized offer",
      "Analyze your most successful campaigns and replicate their key elements",
      "Set up automated follow-up sequences for new customers to improve retention"
    ];

    while (insights.length < 3) {
      const fallback = fallbackInsights[insights.length];
      if (!insights.includes(fallback)) {
        insights.push(fallback);
      }
    }

    return insights;

  } catch (error) {
    console.error('Generate Growth Insights Error:', {
      message: error.message,
      stack: error.stack
    });

    // Return fallback insights on any error
    return [
      "Focus on re-engaging your most valuable customers with personalized outreach",
      "Analyze customer purchase patterns to identify upselling opportunities",
      "Implement a customer feedback system to improve retention and satisfaction"
    ];
  }
};

