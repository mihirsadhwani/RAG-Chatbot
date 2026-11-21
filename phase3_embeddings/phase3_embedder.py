import os
import json
import time
import google.generativeai as genai
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=True))

def generate_embeddings():
    input_file = os.path.join("..", "phase2_processing", "output", "rag_chunks.jsonl")
    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "embeddings.json")
    
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY environment variable not set. Please set it to run embeddings.")
        return
        
    genai.configure(api_key=api_key)
    model = "models/gemini-embedding-001"
    
    chunks = []
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                chunks.append(json.loads(line))

    current_chunk_ids = {chunk["chunk_id"] for chunk in chunks}

    # Keep only embeddings that still belong to the current chunk set before resuming.
    embeddings_data = []
    done_ids = set()
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            embeddings_data = [row for row in json.load(f) if row.get("chunk_id") in current_chunk_ids]
            done_ids = {row["chunk_id"] for row in embeddings_data}
        print(f"[Resume] Found {len(done_ids)} already-embedded chunks. Continuing...")

    for i, chunk in enumerate(chunks):
        if chunk["chunk_id"] in done_ids:
            continue

        print(f"Embedding chunk {i+1}/{len(chunks)} - {chunk['fund_name'][:30]}...")
        
        max_retries = 5
        for attempt in range(max_retries):
            try:
                result = genai.embed_content(
                    model=model,
                    content=chunk["text"],
                    task_type="retrieval_document",
                    title=chunk["fund_name"]
                )
                break
            except Exception as e:
                if "429" in str(e) or "ResourceExhausted" in str(e):
                    wait = 60 * (attempt + 1)
                    print(f"  Rate limited. Waiting {wait}s before retry {attempt+1}/{max_retries}...")
                    time.sleep(wait)
                else:
                    raise
        else:
            print(f"  FAILED after {max_retries} retries, skipping chunk {chunk['chunk_id']}")
            continue
        
        embedding = result['embedding']
        
        row = {
            "chunk_id": chunk["chunk_id"],
            "fund_name": chunk["fund_name"],
            "source_url": chunk["source_url"],
            "text": chunk["text"],
            "chunk_type": chunk.get("chunk_type", "fund_profile"),
            "embedding": embedding
        }
        embeddings_data.append(row)

        # Save after every 20 chunks to avoid losing progress
        if len(embeddings_data) % 20 == 0:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(embeddings_data, f, ensure_ascii=False, indent=2)
            print(f"  [Checkpoint] Saved {len(embeddings_data)} embeddings")

        # Rate-limit: ~1 request per second to stay within 100/min
        time.sleep(1.0)

    # Final save
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(embeddings_data, f, ensure_ascii=False, indent=2)

    print(f"Done! Total embeddings: {len(embeddings_data)}")

if __name__ == "__main__":
    generate_embeddings()

