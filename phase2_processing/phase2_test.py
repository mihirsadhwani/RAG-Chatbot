import json
import os
import sys

def run_tests():
    raw_file = os.path.join("..", "phase1_ingestion", "output", "raw_funds.json")
    processed_file = os.path.join("output", "processed_funds.json")
    docs_file = os.path.join("output", "fund_documents.json")
    chunks_file = os.path.join("output", "rag_chunks.jsonl")
    
    # Check 1: raw_funds.json exists
    assert os.path.exists(raw_file), f"{raw_file} not found"
    
    # Check 2: processed_funds.json created
    assert os.path.exists(processed_file), f"{processed_file} not found"
    with open(processed_file, 'r', encoding='utf-8') as f:
        processed_funds = json.load(f)
    assert len(processed_funds) == 5, f"Expected 5 processed funds, got {len(processed_funds)}"
    
    # Check 3: fund_documents.json created
    assert os.path.exists(docs_file), f"{docs_file} not found"
    with open(docs_file, 'r', encoding='utf-8') as f:
        fund_documents = json.load(f)
    assert len(fund_documents) == 5, f"Expected 5 fund documents, got {len(fund_documents)}"
    for doc in fund_documents:
        assert "fund_name" in doc
        assert "document_text" in doc
        assert "source_url" in doc
        
    # Check 4: rag_chunks.jsonl created
    assert os.path.exists(chunks_file), f"{chunks_file} not found"
    chunks = []
    with open(chunks_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                chunks.append(json.loads(line))
    assert len(chunks) == 5, f"Expected 5 chunks, got {len(chunks)}"
    for chunk in chunks:
        assert "chunk_id" in chunk
        assert "fund_name" in chunk
        assert "source_url" in chunk
        assert "text" in chunk
        assert "chunk_type" in chunk
        
    print("Phase 2 processing successful — RAG knowledge base ready.")

if __name__ == "__main__":
    run_tests()
