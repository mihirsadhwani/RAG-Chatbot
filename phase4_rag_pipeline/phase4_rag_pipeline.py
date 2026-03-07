import json
import os
from phase4_retriever import Retriever
from phase4_generator import Generator

class RAGPipeline:
    def __init__(self):
        # Establish required sub-modules connections
        os.makedirs("output", exist_ok=True)
        self.retriever = Retriever()
        self.generator = Generator()
        
    def query(self, user_query):
        print("Query received")
        
        # 1. Retrieval
        try:
            chunks = self.retriever.retrieve(user_query, top_k=3)
        except Exception as e:
            print(f"Error during retrieval: {e}")
            return {"answer": "Error retrieving from Vector DB.", "sources": []}
            
        # 2. Generation
        try:
            result = self.generator.generate_answer(chunks, user_query)
        except Exception as e:
            print(f"Error during generation: {e}")
            return {"answer": "Error generating answer from LLM.", "sources": []}
            
        return result

if __name__ == "__main__":
    pipeline = RAGPipeline()
    res = pipeline.query("What is the expense ratio of HDFC Large Cap Fund?")
    print("\nResult Data:")
    print(json.dumps(res, indent=2))
