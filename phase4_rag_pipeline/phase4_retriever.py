import os
import json
import numpy as np
import google.generativeai as genai
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=True))

def cosine_similarity(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

class Retriever:
    def __init__(self):
        # User requested path for vector database
        self.vector_db_path = "../phase3_embeddings/output/chroma_db"
        self.abs_db_path = os.path.abspath(self.vector_db_path)
        
        # Internal reference to embeddings.json for fallback or metadata extraction
        self.embeddings_path = os.path.abspath("../phase3_embeddings/output/embeddings.json")
            
        api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set.")
            
        genai.configure(api_key=api_key)
        self.embedding_model = "models/gemini-embedding-001"
        
        self.use_chroma = False
        self.store_data = []

        # Attempt to load ChromaDB as requested
        try:
            import chromadb
            # If the folder doesn't exist, we might crash later, so create it
            os.makedirs(self.abs_db_path, exist_ok=True)
            
            self.client = chromadb.PersistentClient(path=self.abs_db_path)
            # Try to get the collection
            try:
                self.collection = self.client.get_collection("mutual_fund_knowledge")
                # Run a dummy query to check if native binaries (hnswlib) crash on this system
                self.collection.count()
                self.use_chroma = True
                print(f"Retriever initialized with ChromaDB at {self.vector_db_path}")
            except Exception as e_coll:
                print(f"Collection 'mutual_fund_knowledge' not found or empty: {e_coll}")
                self.use_chroma = False
        except Exception as e:
            # Silent crash or explicit error handling
            print(f"Warning: ChromaDB initialization failed/crashed ({e}). Switching to high-performance NumPy fallback.")
            self.use_chroma = False

        # Load data for fallback or metadata reference
        if os.path.exists(self.embeddings_path):
            with open(self.embeddings_path, 'r', encoding='utf-8') as f:
                self.store_data = json.load(f)
        else:
            print(f"Error: Embeddings file not found at {self.embeddings_path}")

    def retrieve(self, query, top_k=3):
        print("Generating embedding")
        result = genai.embed_content(
            model=self.embedding_model,
            content=query,
            task_type="retrieval_query"
        )
        query_vector = result['embedding']
        
        # Attempt ChromaDB query
        if self.use_chroma:
            try:
                print("Searching vector DB (ChromaDB)")
                search_results = self.collection.query(
                    query_embeddings=[query_vector],
                    n_results=top_k
                )
                
                retrieved_chunks = []
                for i in range(len(search_results['ids'][0])):
                    retrieved_chunks.append({
                        "document_text": search_results['documents'][0][i],
                        "fund_name": search_results['metadatas'][0][i].get("fund_name"),
                        "source_url": search_results['metadatas'][0][i].get("source_url"),
                        "similarity_score": float(search_results['distances'][0][i]) if 'distances' in search_results else 0.0
                    })
                return retrieved_chunks
            except Exception as e:
                print(f"ChromaDB Query failed ({e}). Falling back to NumPy.")
                self.use_chroma = False

        # Fallback to NumPy-based similarity search (identical accuracy, higher stability on this system)
        print("Searching vector DB (NumPy fallback)")
        query_vec = np.array(query_vector)
        scored_results = []
        for row in self.store_data:
            v = np.array(row["embedding"])
            score = cosine_similarity(query_vec, v)
            scored_results.append((score, row))
            
        # Sort by score desc
        scored_results.sort(key=lambda x: x[0], reverse=True)
        top_results = scored_results[:top_k]
        
        return [{
            "document_text": row["text"],
            "fund_name": row["fund_name"],
            "source_url": row["source_url"],
            "similarity_score": float(score)
        } for score, row in top_results]
