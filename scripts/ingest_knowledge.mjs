import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

if (!GEMINI_API_KEY || !PINECONE_API_KEY) {
  console.error("Missing API Keys in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pc.index('tutor-index');

async function embedText(text) {
  const result = await embedModel.embedContent({
    content: { role: 'user', parts: [{ text }] },
    outputDimensionality: 1024
  });
  return result.embedding.values;
}

/**
 * Chunks a markdown document into semantically meaningful pieces.
 * Splits on headings (##, #) first, then falls back to double newlines.
 * Each chunk is tagged with its source file for traceability.
 */
function chunkDocument(text, source) {
  // Split on markdown headings (# or ##) to get semantically coherent sections
  const sections = text.split(/(?=^#{1,2}\s)/m);

  const chunks = [];
  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length < 40) continue; // Skip tiny fragments

    // If a section is very large (>1500 chars), sub-split on double newlines
    if (trimmed.length > 1500) {
      const paragraphs = trimmed.split(/\n\n+/);
      let buffer = '';
      for (const para of paragraphs) {
        if (buffer.length + para.length > 1200 && buffer.length > 100) {
          chunks.push({ text: buffer.trim(), source });
          buffer = para;
        } else {
          buffer += '\n\n' + para;
        }
      }
      if (buffer.trim().length > 40) {
        chunks.push({ text: buffer.trim(), source });
      }
    } else {
      chunks.push({ text: trimmed, source });
    }
  }
  return chunks;
}

async function ingest() {
  // Collect all documents to ingest
  const files = [
    { path: path.join(__dirname, '../math_lecture.md'), source: 'math_lecture' },
    { path: path.join(__dirname, '../stories/story1.md'), source: 'story1' },
    { path: path.join(__dirname, '../stories/story2.md'), source: 'story2' },
    { path: path.join(__dirname, '../stories/story3.md'), source: 'story3' },
    { path: path.join(__dirname, '../stories/story4.md'), source: 'story4' },
  ];

  let allChunks = [];

  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.log(`⚠️  Skipping ${file.source}: file not found at ${file.path}`);
      continue;
    }
    console.log(`📖 Reading ${file.source}...`);
    const text = fs.readFileSync(file.path, 'utf8');
    const chunks = chunkDocument(text, file.source);
    console.log(`   → ${chunks.length} chunks extracted.`);
    allChunks = allChunks.concat(chunks);
  }

  console.log(`\n🧠 Total chunks to embed: ${allChunks.length}. Creating embeddings...\n`);

  const vectors = [];

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    try {
      const embedding = await embedText(chunk.text);
      const id = crypto.createHash('md5').update(chunk.text).digest('hex');

      vectors.push({
        id: `${chunk.source}_${id}`,
        values: embedding,
        metadata: {
          type: 'knowledge',
          source: chunk.source,
          text: chunk.text.substring(0, 3500) // Pinecone metadata limit
        }
      });

      process.stdout.write('.');
    } catch (e) {
      console.error(`\n❌ Failed chunk ${i} (${chunk.source}): ${e.message}`);
    }
    // Rate limit buffer
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n\n☁️  Uploading ${vectors.length} vectors to Pinecone...`);

  // Upsert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    if (batch.length > 0) {
      await index.upsert({ records: batch });
      console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1} uploaded (${batch.length} vectors)`);
    }
  }

  console.log(`\n✅ Knowledge Base ingestion complete! ${vectors.length} vectors live in Pinecone.`);
}

ingest().catch(console.error);
