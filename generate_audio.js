const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash-tts' });

async function generateSpeech(text) {
  const result = await model.generateContent({
    contents: [{ parts: [{ text }] }],
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

  if (!result.response || !result.response.candidates || result.response.candidates.length === 0) {
    throw new Error('No candidate returned');
  }

  const candidate = result.response.candidates[0];
  if (!candidate.content || !candidate.content.parts) {
    throw new Error('No parts returned');
  }

  const part = candidate.content.parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));
  if (!part) {
    throw new Error('No audio data returned');
  }

  return Buffer.from(part.inlineData.data, 'base64');
}

// Read all scenes
const scenesDir = path.join(__dirname, 'js', 'scenes');
const files = fs.readdirSync(scenesDir).filter(f => f.endsWith('.js'));

const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);

async function run() {
  for (const file of files) {
    const content = fs.readFileSync(path.join(scenesDir, file), 'utf8');
    
    // Quick regex to extract narration and audioId
    const beatRegex = /narration:\s*(['"`])(.*?)\1,\s*audioId:\s*(['"`])(.*?)\3/gs;
    let match;
    while ((match = beatRegex.exec(content)) !== null) {
      const text = match[2];
      const audioId = match[4];
      
      const outFile = path.join(audioDir, `${audioId}.wav`);
      if (fs.existsSync(outFile)) {
        console.log(`Skipping ${audioId}, already exists.`);
        continue;
      }
      
      console.log(`Generating ${audioId}: ${text.substring(0, 30)}...`);
      let success = false;
      while (!success) {
        try {
          const audioBuffer = await generateSpeech(text);
          fs.writeFileSync(outFile, audioBuffer);
          console.log(`Saved ${outFile}`);
          success = true;
        } catch (err) {
          if (err.status === 429) {
            console.log(`Rate limited! Sleeping for 30 seconds...`);
            await new Promise(r => setTimeout(r, 30000));
          } else {
            console.error(`Failed on ${audioId}:`, err);
            break; // skip on fatal
          }
        }
      }
      
      // Sleep a bit to avoid rate limits
      await new Promise(r => setTimeout(r, 7000));
    }
  }
  console.log('All done!');
}

run();
