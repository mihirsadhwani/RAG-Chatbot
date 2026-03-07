import os
import json
import google.generativeai as genai
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=True))

class Generator:
    def __init__(self):
        api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set.")
            
        genai.configure(api_key=api_key)
        
        system_instruction = """You are a mutual fund information assistant.

Answer the question using ONLY the provided context.

Rules:
1. Only provide factual information
2. Do not give investment advice. If asked questions like "Should I invest in this fund?" or "Which fund is better?", respond exactly with: "I can only provide factual information about mutual funds, not investment advice."
3. Keep answers short (max 3 sentences)
4. Always include the Groww source link corresponding to the fund context."""
        
        self.model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=system_instruction)
        
    def generate_answer(self, retrieved_chunks, query):
        print("Sending prompt to Gemini")
        
        context_parts = []
        unique_sources = set()
        
        for chunk in retrieved_chunks:
            context_parts.append(f"Fund Name: {chunk['fund_name']}\nContent: {chunk['document_text']}\nSource: {chunk['source_url']}")
            unique_sources.add(chunk['source_url'])
            
        context_str = "\n\n---\n\n".join(context_parts)
        
        prompt = f"""Context:
{context_str}

User Question:
{query}

Answer:"""
        
        response = self.model.generate_content(prompt)
        print("Answer generated")
        
        return {
            "answer": response.text.strip(),
            "sources": list(unique_sources)
        }
