require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pinecone } = require('@pinecone-database/pinecone');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const port = process.env.PORT || 8080;
// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-flash-lite-latest",
  systemInstruction: `You are voicing a cartoon character who teaches time series. You speak like a real human would in a casual lecture — stumbling, using filler words, cracking jokes, using slang. NEVER sound like a textbook or an AI assistant.

RULES:
- Maximum 2 sentences. Short ones.
- Use contractions (don't, it's, we're, that's).
- Use spoken math: say "lag one" not "lag-1", say "rho" not "ρ", say "alpha" not "α".
- Drop in reactions: "wait wait wait", "check this out", "see that?", "wild right?", "okay so basically..."
- Occasionally interrupt yourself mid-thought.
- NO markdown, NO bullet points, NO emojis, NO numbered lists.
- NO phrases like "let's explore", "it's important to note", "this is because", "essentially", "fundamentally".
- Talk like you're explaining to a friend at a whiteboard, not writing a paper.`
});
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

// Initialize Pinecone
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index('tutor-index');

const ELEVENLABS_VOICE_ID = 'jBpfuIE2acCO8z3wKNLl'; // Gigi (Animation voice)

async function embedText(text) {
  const result = await embedModel.embedContent({
    content: { role: 'user', parts: [{ text }] },
    outputDimensionality: 1024
  });
  return result.embedding.values;
}

app.post('/api/generate-beat', async (req, res) => {
  try {
    const { directive, previousContext } = req.body;

    console.log(`\n🤖 Request received for directive: "${directive}"`);

    // 1. Embed the directive to search the Vector DB
    const queryVector = await embedText(directive);

    // 2. Search Pinecone for the 2 most relevant chunks
    const searchResults = await index.query({
      vector: queryVector,
      topK: 2,
      includeMetadata: true
    });

    // 3. Compile the retrieved knowledge
    let contextStr = "Reference Knowledge:\n";
    if (searchResults.matches && searchResults.matches.length > 0) {
      searchResults.matches.forEach(match => {
        contextStr += `- ${match.metadata.text}\n`;
      });
    } else {
      contextStr += "No relevant reference material found.\n";
    }
    console.log(`📚 Retrieved ${searchResults.matches.length} relevant chunks from Pinecone.`);

    // 4. Ask Gemini to generate the dialogue using the RAG context
    const prompt = `Context of what just happened: ${previousContext || 'None'}
    
${contextStr}

Your teaching directive right now: ${directive}

Using the Reference Knowledge to ensure accuracy, generate your spoken dialogue.`;
    
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    console.log(`🗣️ Avatar says: "${text}"`);

    // 5. Ask ElevenLabs to speak it
    const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!elevenResponse.ok) {
      throw new Error(`ElevenLabs API error: ${elevenResponse.status} ${elevenResponse.statusText}`);
    }

    const audioBuffer = await elevenResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioDataUrl = `data:audio/mp3;base64,${audioBase64}`;

    // Return the response to the frontend immediately so the user doesn't wait
    res.json({
      text: text,
      audioUrl: audioDataUrl
    });

    // 6. CONTINUOUS LEARNING (Async)
    // Save what the avatar just said back into the Vector DB as a "memory"
    try {
      const memoryVector = await embedText(text);
      const id = crypto.createHash('md5').update(text).digest('hex');
      await index.upsert({ records: [{
        id: `memory_${id}`,
        values: memoryVector,
        metadata: {
          type: "memory",
          text: `Past explanation you gave: "${text}"`
        }
      }] });
      console.log(`🧠 Saved memory to Pinecone.`);
    } catch (memErr) {
      console.error(`Failed to save memory:`, memErr);
    }

  } catch (error) {
    console.error('Error generating beat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize Gemini TTS Model
const ttsModel = genAI.getGenerativeModel({ model: "gemini-3.8-flash-lite-tts" });

// ----------------------------------------------------
// TTS API: Generate audio for default scripted beats
// ----------------------------------------------------
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  try {
    const ttsResult = await ttsModel.generateContent(text);
    const audioPart = ttsResult.response.candidates[0].content.parts.find(p => p.inlineData);
    
    if (!audioPart || !audioPart.inlineData) {
      throw new Error("Gemini TTS did not return audio data.");
    }
    
    const audioData = audioPart.inlineData.data;
    res.json({ audioUrl: `data:audio/wav;base64,${audioData}` });
  } catch (error) {
    console.error('TTS Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// INTERRUPT API: Handle direct user questions
// ----------------------------------------------------
app.post('/api/ask-tutor', async (req, res) => {
  const { question, currentContext } = req.body;
  
  try {
    console.log(`\n🙋‍♂️ User asked: "${question}"`);
    
    // 1. Embed user question
    const queryVector = await embedText(question);
    
    // 2. Search Pinecone for context
    const searchRes = await index.query({
      vector: queryVector,
      topK: 3,
      includeMetadata: true
    });
    
    const contextStrs = searchRes.matches.map(m => `[Source: ${m.metadata.source}]\n${m.metadata.text}`);
    const referenceKnowledge = contextStrs.join('\n\n---\n\n');
    console.log(`📚 Retrieved ${searchRes.matches.length} chunks for answer.`);

    // 3. Ask Gemini to answer (text)
    const prompt = `
You were just teaching the following: "${currentContext}".
The student interrupted and asked: "${question}".

Using the Reference Knowledge below, answer their question directly, casually, and accurately.
If the answer is not in the knowledge, use your best judgment but keep it related to Time Series.

Reference Knowledge:
${referenceKnowledge}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log(`💬 Avatar answered: "${text}"`);

    // 4. Generate Voice with Gemini TTS
    console.log(`🎤 Generating audio with Gemini TTS...`);
    const ttsResult = await ttsModel.generateContent(text);
    const audioPart = ttsResult.response.candidates[0].content.parts.find(p => p.inlineData);
    
    if (!audioPart || !audioPart.inlineData) {
      throw new Error("Gemini TTS did not return audio data.");
    }
    
    const audioBase64 = audioPart.inlineData.data;
    const audioDataUrl = `data:audio/wav;base64,${audioBase64}`;

    res.json({ text, audioUrl: audioDataUrl });

    // 5. Memory
    try {
      const memoryVector = await embedText(text);
      const id = crypto.createHash('md5').update(text).digest('hex');
      await index.upsert({ records: [{
        id: `memory_${id}`,
        values: memoryVector,
        metadata: { type: "memory", text: `Past explanation: "${text}"` }
      }] });
    } catch (e) { /* ignore */ }

  } catch (error) {
    console.error('Error answering:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 RAG AI Server running on port ${port}`);
});
