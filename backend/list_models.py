"""
Run this script to list all models available to your API key.
Usage: python list_models.py
"""
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY not found in .env")
    exit(1)

client = genai.Client(api_key=api_key)

print(f"Using API key: {api_key[:12]}...")
print("\n--- Available models that support generateContent ---\n")

for model in client.models.list():
    # Only show models that support content generation
    supported = getattr(model, 'supported_actions', []) or []
    name = model.name or ""
    if "generateContent" in supported or "gemini" in name.lower():
        print(f"  {name}")

print("\nDone. Copy a model name above and set it as GEMINI_MODEL in your .env")
