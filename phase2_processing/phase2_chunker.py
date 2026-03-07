import json
import os
import uuid

def create_chunks():
    input_file = os.path.join("output", "fund_documents.json")
    output_file = os.path.join("output", "rag_chunks.jsonl")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        documents = json.load(f)
        
    chunks = []
    
    for doc in documents:
        chunk = {
            "chunk_id": str(uuid.uuid4()),
            "fund_name": doc["fund_name"],
            "source_url": doc["source_url"],
            "text": doc["document_text"],
            "chunk_type": "fund_profile"
        }
        chunks.append(chunk)
        
    with open(output_file, 'w', encoding='utf-8') as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
            
    print(f"Created {len(chunks)} RAG chunks.")

if __name__ == "__main__":
    create_chunks()
