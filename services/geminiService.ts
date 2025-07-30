
import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
  // In a real app, you'd want to handle this more gracefully,
  // maybe showing an error message to the user.
  // For this example, we'll throw an error.
  console.warn("API key not found. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || " " });

export const getAiTutorResponse = async (prompt: string, history: { role: string, parts: { text: string }[] }[]) => {
  if (!process.env.API_KEY) {
    return "AI Tutor is currently unavailable. Please configure the API key.";
  }
  
  try {
    const model = 'gemini-2.5-flash';
    const chat = ai.chats.create({
        model,
        history,
        config: {
            systemInstruction: "You are an expert AI Study Buddy. Your goal is to explain complex topics in a simple, easy-to-understand way. Be encouraging and supportive. When relevant, include links to external resources like articles or YouTube videos in markdown format (e.g., [Resource Title](https://example.com)). Keep responses concise and focused on the user's question.",
        }
    });

    const result = await chat.sendMessage({ message: prompt });
    return result.text;
  } catch (error) {
    console.error("Error getting AI tutor response:", error);
    return "Sorry, I encountered an error. Please try again.";
  }
};

export const findLearningMaterials = async (query: string, goal: string): Promise<any[]> => {
  if (!process.env.API_KEY) {
    return [];
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find a list of 3-5 high-quality, English learning materials for the topic "${query}" within the broader subject of "${goal}". The materials should be diverse (articles, videos, interactive tutorials, etc.).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            materials: {
              type: Type.ARRAY,
              description: "A list of learning materials.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'The full title of the learning material.' },
                  source: { type: Type.STRING, description: 'The name of the source website or platform, e.g., "Khan Academy", "YouTube", "freeCodeCamp".' },
                  url: { type: Type.STRING, description: 'The direct, full URL to the learning material.' },
                  type: { type: Type.STRING, description: 'The type of material. Examples: "Article", "Video", "Interactive", "Course", "Tutorial", "Docs".' },
                },
                required: ["title", "source", "url", "type"]
              }
            }
          },
          required: ["materials"]
        },
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) return [];
    
    const parsed = JSON.parse(jsonText);
    return parsed.materials || [];

  } catch (error) {
    console.error("Error finding learning materials:", error);
    return [];
  }
};
