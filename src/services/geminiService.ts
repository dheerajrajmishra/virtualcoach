import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: '' });

export const geminiService = {
  // Translate content
  translate: async (text: string, targetLang: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text to ${targetLang}. Only return the translation.\n\n${text}`,
      });
      return response.text?.trim() || text;
    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  },

  // Match FAQ using semantic understanding
  matchFAQ: async (question: string, faqList: any[]) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a product trainer. A learner asked: "${question}". 
        
        Based ONLY on the following FAQ list, provide the most relevant answer. 
        If no relevant answer exists, say "I don't have information on that, but I've noted it for your supervisor."
        
        FAQ List:
        ${JSON.stringify(faqList)}
        
        Return ONLY the answer text.`,
      });
      return response.text?.trim();
    } catch (error) {
      console.error("FAQ matching error:", error);
      return "Sorry, I encountered an error while processing your request.";
    }
  },

  // Evaluate quiz answers
  evaluateAnswer: async (question: string, correctAnswer: string, userAnswer: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Evaluate the following user answer to a training question. 
        Question: ${question}
        Correct Answer Template: ${correctAnswer}
        User Answer: ${userAnswer}
        
        Determine if the user's answer is conceptually correct.
        Provide feedback if incorrect.
        
        Return JSON format: { "correct": boolean, "feedback": "string" }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              correct: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING }
            },
            required: ["correct", "feedback"]
          }
        }
      });
      return JSON.parse(response.text || '{"correct": false, "feedback": "Error parsing result"}');
    } catch (error) {
       console.error("Evaluation error:", error);
       return { correct: false, feedback: "Unable to evaluate answer right now." };
    }
  }
};
