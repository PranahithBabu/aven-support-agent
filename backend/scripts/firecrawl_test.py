import asyncio
import json
import os
from dotenv import load_dotenv
from firecrawl import AsyncFirecrawlApp, ScrapeOptions
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone

load_dotenv()

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_ENVIRONMENT")
INDEX_NAME = os.getenv("PINECONE_INDEX")
RAW_OUTPUT_PATH = "data/firecrawl_raw_result.json"
FAQ_OUTPUT_PATH = "data/aven_support_faqs_from_firecrawl.json"


def extract_faqs_from_markdown(pages):
    faqs = []
    for page in pages:
        if hasattr(page.content, "markdown") and page.content.markdown:
            lines = page.content.markdown.split('\n')
            q, a = None, []
            for line in lines:
                if line.endswith('?') and len(line) < 200:
                    if q and a:
                        faqs.append({"question": q, "answer": " ".join(a).strip()})
                    q, a = line, []
                elif q:
                    a.append(line)
            if q and a:
                faqs.append({"question": q, "answer": " ".join(a).strip()})
    return faqs


async def main():
    print("🔥 Starting crawl using Firecrawl...")

    app = AsyncFirecrawlApp(api_key=FIRECRAWL_API_KEY)

    # Step 1: Kick off the crawl
    crawl_status = await app.crawl_url(
        url="https://www.aven.com/support",
        limit=100,
        allow_backward_links=True,
        scrape_options=ScrapeOptions(
            formats=["markdown"],
            onlyMainContent=False,
            parsePDF=True,
            maxAge=14400000
        )
    )

    # ✅ Get crawl_id properly
    crawl_id = getattr(crawl_status, "crawl_id", None)
    if not crawl_id:
        raise ValueError("❌ Crawl ID missing. Firecrawl request failed.")

    print(f"⏳ Waiting for crawl to complete (crawl_id: {crawl_id})")

    # Step 2: Poll until finished
    for _ in range(30):
        crawl_result = await app.get_crawl_result(crawl_id)
        if crawl_result.status == "finished":
            print("✅ Crawl completed.")

            # 💾 Save raw response for inspection
            os.makedirs("data", exist_ok=True)
            with open(RAW_OUTPUT_PATH, "w", encoding="utf-8") as f:
                f.write(crawl_result.model_dump_json(indent=2))
            break
        elif crawl_result.status == "failed":
            raise RuntimeError("❌ Crawl failed.")
        await asyncio.sleep(2)
    else:
        raise TimeoutError("⌛ Timed out waiting for crawl.")

    # Step 3: Extract Q&A
    if not crawl_result.pages:
        raise ValueError("❌ No pages returned in crawl result.")

    faqs = extract_faqs_from_markdown(crawl_result.pages)
    print(f"✅ Extracted {len(faqs)} FAQs")

    with open(FAQ_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(faqs, f, indent=2)

    # Step 4: Upload to Pinecone
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(INDEX_NAME)
    model = SentenceTransformer("all-MiniLM-L6-v2")

    vectors = [
        (f"faq-firecrawl-{i}", model.encode(f"{f['question']} {f['answer']}").tolist(), f)
        for i, f in enumerate(faqs)
    ]

    index.upsert(vectors=vectors)
    print(f"🚀 Uploaded {len(vectors)} vectors to Pinecone index '{INDEX_NAME}'")


if __name__ == "__main__":
    asyncio.run(main())
