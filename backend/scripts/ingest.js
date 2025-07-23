require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PineconeClient } = require('pinecone-client');

// Loading the scraped content
const docs = [
  { id: '1', text: fs.readFileSync('exa_aven_support_contents.json', 'utf8') },
];

// Chunking function
function chunkText(text, chunkSize = 500) {
  const paragraphs = text.split('\n\n');
  let chunks = [];
  let current = '';
  for (let p of paragraphs) {
    if ((current + p).length > chunkSize) {
      chunks.push(current);
      current = '';
    }
    current += p + '\n\n';
  }
  if (current) chunks.push(current);
  return chunks;
}

// Embedding into LLM and uploading to Pinecone vecotor DB
async function ingest() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const pinecone = new PineconeClient();
  await pinecone.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  const index = pinecone.Index(process.env.PINECONE_INDEX);

  for (let doc of docs) {
    const chunks = chunkText(doc.text);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingRes = await genAI.embedContent({
        model: 'models/embedding-001',
        content: chunk,
      });
      const embedding = embeddingRes.embedding.values;
      await index.upsert([
        {
          id: `${doc.id}-${i}`,
          values: embedding,
          metadata: { text: chunk },
        },
      ]);
      console.log(`Uploaded chunk ${i} of doc ${doc.id}`);
    }
  }
}

ingest();