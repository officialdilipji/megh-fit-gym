
import { GoogleGenAI } from "@google/genai";

/* Initialize GoogleGenAI using process.env.API_KEY directly as a named parameter */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getFitnessInsights = async (member: {
  name: string;
  age: number;
  gender: string;
  goals: string;
  tier: string;
}) => {
  try {
    /* Use ai.models.generateContent to query GenAI directly with both model and prompt */
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a 3-sentence high-energy 'Megh FIT Starter Kit' advice for a new gym member named ${member.name}. 
      Context: ${member.age} year old ${member.gender}, goals: ${member.goals}, membership tier: ${member.tier}.
      Focus on motivation, a key exercise relevant to their tier perks, and a nutrition tip.`,
    });
    /* The .text property is used directly as it returns the string output */
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Welcome to the team! Push your limits and stay consistent.";
  }
};
