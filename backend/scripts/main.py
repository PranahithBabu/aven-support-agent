from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import requests
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from dotenv import load_dotenv

# To load environment variables from .env file
load_dotenv()

# Configuration details
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_ENVIRONMENT")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = os.getenv("GROQ_MODEL_NAME")

# Initializing Pinecone and SentenceTransformer
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX_NAME)
encoder = SentenceTransformer("all-MiniLM-L6-v2")

# FastAPI app initialization
app = FastAPI()

# Ensuring request flow to the frontend without any CORS middleware restrictions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Building prompt to pass to the LLM along with the context and user input
def build_prompt(contexts, user_question):
    context_text = "\n\n".join(
        f"Q: {m['metadata']['question']}\nA: {m['metadata']['answer']}" for m in contexts
    )
    return f"""You are Aven's helpful customer support assistant.

Use the following FAQs to answer the user’s question in a clear, friendly, and concise way. Only respond based on the given FAQs — do not add extra details or assumptions. If the answer isn’t found, say you don’t know.

### FAQ Knowledge:
{context_text}

### User Question:
{user_question}

### Answer (Keep it short and to the point):"""

# Querying Pinecone for the most relevant data
def query_pinecone(query, top_k=5):
    vec = encoder.encode(query).tolist()
    res = index.query(vector=vec, top_k=top_k, include_metadata=True)
    return res["matches"]

# Asking the LLM for the answer
def ask_groq_llm(prompt):
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant for Aven."},
            {"role": "user", "content": prompt}
        ]
    }
    response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data)
    try:
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print("❌ Groq error:", e)
        print("📨 Raw response:", response.text)
        return "Sorry, I couldn't get a response from the AI."

# Querying the LLM for the answer
@app.post("/query")
async def query(request: Request):
    body = await request.json()
    user_question = body.get("question", "").strip()

    if not user_question:
        return JSONResponse(content={"answer": "No question provided."}, status_code=400)

    matches = query_pinecone(user_question)
    if not matches:
        return JSONResponse(content={"answer": "Sorry, I couldn’t find anything relevant in the FAQ."})

    prompt = build_prompt(matches, user_question)
    answer = ask_groq_llm(prompt)
    return JSONResponse(content={"answer": answer})
