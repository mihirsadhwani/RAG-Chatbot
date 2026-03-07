import os
import json
import chromadb

def populate_vector_store():
    input_file = os.path.join("output", "embeddings.json")
    db_path = os.path.join("output", "chroma_db")
    
    # Ensure directory exists or is clean for fresh start
    if os.path.exists(db_path):
        import shutil
        try:
            shutil.rmtree(db_path)
        except Exception:
            pass
    os.makedirs(db_path, exist_ok=True)
    
    client = chromadb.PersistentClient(path=db_path)
    
    # We use hnsw:space cosine for similarity
    collection = client.create_collection(
        name="mutual_fund_knowledge",
        metadata={"hnsw:space": "cosine"}
    )
        
    with open(input_file, 'r', encoding='utf-8') as f:
        embeddings_data = json.load(f)
        
    ids = []
    embeddings = []
    documents = []
    metadatas = []
    
    for row in embeddings_data:
        ids.append(row["chunk_id"])
        embeddings.append(row["embedding"])
        documents.append(row["text"])
        metadatas.append({
            "fund_name": row["fund_name"],
            "source_url": row["source_url"],
            "chunk_type": row.get("chunk_type", "fund_profile")
        })
        
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )
    
    print("Vector database created successfully using ChromaDB.")
    print(f"Total chunks indexed: {len(embeddings_data)}")

if __name__ == "__main__":
    populate_vector_store()
