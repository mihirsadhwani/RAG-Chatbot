import os
import json
import sys

# Ensure this is executed from the correct directory 
# or append Python path to allow tests execution directly from root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from phase4_rag_pipeline import RAGPipeline

def run_tests():
    # 1. Vector DB exists
    db_path = os.path.join("..", "phase3_embeddings", "output", "vector_store", "store.json")
    if not os.path.exists(db_path):
        print(f"Error: Vector DB not found at {db_path}")
        return
        
    pipeline = RAGPipeline()
    query = "What is the expense ratio of HDFC Large Cap Fund?"
    
    # Run exact pipeline query
    print("Query received")
    
    # Bypass inner print commands for clean output requirements or just rely on them
    chunks = pipeline.retriever.retrieve(query, top_k=3)
    
    # 2. Retriever works
    assert len(chunks) >= 1, "Expected at least 1 document chunk."
    print("Retrieved chunks:")
    for i, c in enumerate(chunks):
        print(f"{i+1}. {c['fund_name']}")
        
    print("\nGenerating answer with Gemini\n")
    
    # 3. Generation works
    result = pipeline.generator.generate_answer(chunks, query)
    
    print("\nAnswer:")
    print(result["answer"])
    
    print("\nSource:")
    for src in result["sources"]:
        print(src)

if __name__ == "__main__":
    run_tests()
