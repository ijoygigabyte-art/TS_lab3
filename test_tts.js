require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

async function test() {
  try {
    const result = await model.generateContent({
      contents: [{ parts: [{ text: "Hello world" }] }],
      generationConfig: {
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Aoede", 
            }
          }
        }
      }
    });
    console.log("Success with gemini-3.8-flash");
    return;
  } catch(e) {
    console.error("3.8-flash failed:", e.message);
  }
}
test();
