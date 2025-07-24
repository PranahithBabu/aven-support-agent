import asyncio
import os
import re
from firecrawl import AsyncFirecrawlApp, ScrapeOptions
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from dotenv import load_dotenv
import json

load_dotenv()

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX")

# Chunking helper: split by heading or paragraph, or every N tokens
CHUNK_SIZE = 500

def chunk_text(text, chunk_size=CHUNK_SIZE):
    # Split by double newlines or headings, then group into chunks
    paragraphs = re.split(r'\n{2,}|(?=^#)', text, flags=re.MULTILINE)
    chunks = []
    current = ''
    for p in paragraphs:
        if len(current) + len(p) > chunk_size:
            if current:
                chunks.append(current.strip())
                current = ''
        current += p + '\n'
    if current.strip():
        chunks.append(current.strip())
    return [c for c in chunks if len(c.strip()) > 50]

async def main():
    app = AsyncFirecrawlApp(api_key=FIRECRAWL_API_KEY)
    # response = await app.crawl_url(
    #     url='https://www.aven.com/support',
    #     limit=100,
    #     scrape_options=ScrapeOptions(
    #         formats=['markdown'],
    #         onlyMainContent=True,
    #         parsePDF=True,
    #         maxAge=14400000
    #     )
    # )
    response = await app.crawl_url(
        url='https://www.aven.com/support',
        limit=100,
        allow_backward_links=True,
        scrape_options=ScrapeOptions(
            formats=['markdown', 'links'],
            onlyMainContent=False,
            parsePDF=True,
            maxAge=14400000
        )
    )
    # Write the response to a file
    with open('data/firecrawl_response.json', 'w') as f:
        json.dump(response, f, indent=2)

    # print("Response: ", response)
    print(f"Scraped {len(response.results)} pages from sitemap.")

    # Prepare data for Pinecone
    encoder = SentenceTransformer("llama3-8b-8192")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX)
    vectors = []
    chunk_count = 0
    for page in response.results:
        title = page.get('title', '')
        url = page.get('url', '')
        content = page.get('content', '')
        if not content.strip():
            continue
        chunks = chunk_text(content)
        for i, chunk in enumerate(chunks):
            vec = encoder.encode(chunk).tolist()
            meta = {"title": title, "url": url, "chunk": i}
            vectors.append((f"aven-{chunk_count}", vec, meta))
            chunk_count += 1
    print(f"Prepared {len(vectors)} chunks for Pinecone upload.")
    # Upsert in batches (Pinecone recommends batches of 100)
    BATCH_SIZE = 100
    for i in range(0, len(vectors), BATCH_SIZE):
        batch = vectors[i:i+BATCH_SIZE]
        index.upsert(vectors=batch)
        print(f"Uploaded batch {i//BATCH_SIZE+1} ({len(batch)} vectors)")
    print(f"✅ Uploaded {len(vectors)} vectors to Pinecone index '{PINECONE_INDEX}'")

if __name__ == "__main__":
    asyncio.run(main()) 