import { NextResponse } from 'next/server';
import { PineconeClient } from 'pinecone-client';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  const { query } = await req.json();

  // Embedding the user query
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const embeddingRes = await genAI.embedContent({
    model: 'models/embedding-001',
    content: query,
  });
  const queryEmbedding = embeddingRes.embedding.values;

  // Searching for similar content in Pinecone DB
  const pinecone = new PineconeClient();
  await pinecone.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  const index = pinecone.Index(process.env.PINECONE_INDEX);
  const searchResponse = await index.query({
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true,
  });

  // Building context from top results
  const context = searchResponse.matches
    .map(match => match.metadata.text)
    .join('\n---\n');

  // Generating answer with Groq API
  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: 'You are a helpful support agent for Aven. Use the provided context to answer.' },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` },
      ],
      max_tokens: 300,
    }),
  });

  if (!groqRes.ok) {
    return NextResponse.json({ answer: "Sorry, I couldn't get a response from the LLM." }, { status: 500 });
  }
  const groqData = await groqRes.json();
  const answer = groqData.choices?.[0]?.message?.content || "Sorry, I couldn't find an answer.";

  return NextResponse.json({ answer });
}