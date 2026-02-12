
import { GoogleGenAI } from "@google/genai";

/* Initialize GoogleGenAI using process.env.API_KEY directly as mandated by guidelines */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Updated the property name from 'goals' to 'fitnessGoals' to match the Member interface
export const getFitnessInsights = async (member: {
  name: string;
  age: number;
  gender: string;
  fitnessGoals: string;
  tier: string;
}): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a 3-sentence high-energy 'Megh FIT Starter Kit' advice for a new gym member named ${member.name}. 
      Context: ${member.age} year old ${member.gender}, goals: ${member.fitnessGoals}, membership tier: ${member.tier}.
      Focus on motivation, a key exercise relevant to their tier perks, and a nutrition tip.`,
    });
    
    // Explicitly handle undefined to satisfy strict TS checks, using the .text property
    const textOutput = response.text;
    if (!textOutput) {
      return "Welcome to the team! Push your limits and stay consistent.";
    }
    return textOutput;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Welcome to the team! Push your limits and stay consistent.";
  }
};
