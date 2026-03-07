import os
import json
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
                
    embeddings_data = []
    for i, chunk in enumerate(chunks):
        print(f"Embedding chunk {i+1}/{len(chunks)}")
        
        result = genai.embed_content(
            model=model,
            content=chunk["text"],
            task_type="retrieval_document",
            title=chunk["fund_name"]
        )
        
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
        
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(embeddings_data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    generate_embeddings()
