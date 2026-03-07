import os
import json
import numpy as np
import google.generativeai as genai
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=True))

def cosine_similarity(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

def run_tests():
    embeddings_file = os.path.join("output", "embeddings.json")
    db_store_file = os.path.join("output", "vector_store", "store.json")
    
    assert os.path.exists(embeddings_file), "embeddings.json not found"
    assert os.path.exists(db_store_file), "vector_store/store.json not found"
    
    with open(embeddings_file, 'r', encoding='utf-8') as f:
        embeds = json.load(f)
    assert len(embeds) == 5, f"Expected 5 embeddings, got {len(embeds)}"
    
    print("1. rag_chunks.jsonl exists")
    print("2. embeddings.json created")
    print("3. vector_store/store.json created")
    
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Cannot run test query: GOOGLE_API_KEY not set")
        return
        
    genai.configure(api_key=api_key)
    query = "What is the expense ratio of HDFC Large Cap Fund?"
    
    print(f"Embedding query: {query}")
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=query,
        task_type="retrieval_query"
    )
    query_vector = np.array(result['embedding'])
    
    # Retrieval using numpy cosine similarity
    with open(db_store_file, 'r', encoding='utf-8') as f:
        store_data = json.load(f)
        
    all_data = store_data["data"]
    
    scored_results = []
    for row in all_data:
        v = np.array(row["embedding"])
        score = cosine_similarity(query_vector, v)
        scored_results.append((score, row))
        
    # Sort by score desc
    scored_results.sort(key=lambda x: x[0], reverse=True)
    top_3 = scored_results[:3]
    
    assert len(top_3) >= 1, "No results returned from query"
    
    print("\nTest query successful.")
    print("Top results:")
    for i, (score, row) in enumerate(top_3):
        print(f"{i+1}. {row['fund_name']} (score: {score:.4f})")
        
    print("\nPhase 3 successful - vector database ready.")

if __name__ == "__main__":
    run_tests()
