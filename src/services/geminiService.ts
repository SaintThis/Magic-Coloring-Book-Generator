import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  return new GoogleGenAI({ apiKey });
};

export const generatePrompts = async (theme: string): Promise<string[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 5 distinct and simple descriptions for coloring book pages based on the theme: "${theme}". 
    Each description should be a single sentence focusing on a specific scene or character. 
    Return the result as a JSON array of strings.`,
    config: {
      responseMimeType: "application/json",
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse prompts", e);
    return [theme, theme, theme, theme, theme];
  }
};

export const generateColoringImage = async (prompt: string, size: "1K" | "2K" | "4K"): Promise<string> => {
  const ai = getAI();
  const fullPrompt = `Children's coloring book page, black and white line art, thick outlines, simple shapes, ${prompt}, high contrast, no shading, white background, minimalist style, suitable for toddlers, no gray areas.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: fullPrompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: size
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const chatWithGemini = async (messages: { role: string, content: string }[]) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are a creative assistant for a children's coloring book generator. Help users come up with fun themes and explain how the app works. Keep your tone playful and encouraging.",
    },
  });

  const lastMessage = messages[messages.length - 1].content;
  const response = await chat.sendMessage({ message: lastMessage });
  return response.text;
};
