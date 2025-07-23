import pymupdf
import json
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
import os

# === CONFIG ===
PDF_PATH = "data/Support_Aven_Card.pdf"
OUTPUT_PATH = "data/aven_support_faqs.json"
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_ENVIRONMENT")
INDEX_NAME = os.getenv("PINECONE_INDEX")

# === Extract Q&A from PDF ===
def extract_faqs_from_pdf(pdf_path):
    doc = pymupdf.open(pdf_path)
    lines = [page.get_text() for page in doc]
    lines = "\n".join(lines).split("\n")
    lines = [line.strip() for line in lines if line.strip()]

    faqs = []
    q, a = None, []

    for line in lines:
        if line.endswith("?") and len(line) < 200:
            if q and a:
                faqs.append({"question": q, "answer": " ".join(a).strip()})
            q, a = line, []
        elif q:
            a.append(line)

    if q and a:
        faqs.append({"question": q, "answer": " ".join(a).strip()})

    return faqs

# === Upload to Pinecone ===
faqs = extract_faqs_from_pdf(PDF_PATH)
with open(OUTPUT_PATH, 'w') as f:
    json.dump(faqs, f, indent=2)

print(f"✅ Extracted {len(faqs)} FAQs to {OUTPUT_PATH}")

pc = Pinecone(api_key=PINECONE_API_KEY, environment=PINECONE_ENV)
index = pc.Index(INDEX_NAME)
model = SentenceTransformer("all-MiniLM-L6-v2")

vectors = [
    (f"faq-{i}", model.encode(f"{f['question']} {f['answer']}").tolist(), f)
    for i, f in enumerate(faqs)
]

index.upsert(vectors=vectors)
print(f"✅ Uploaded {len(vectors)} vectors to Pinecone index '{INDEX_NAME}'")
