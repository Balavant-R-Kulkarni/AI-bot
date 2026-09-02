import os
from typing import List, Dict
import google.generativeai as genai

class ChatModel:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not set in environment")

        genai.configure(api_key=self.api_key)
        self.model_name = "gemini-3.6-flash"
        self.model = genai.GenerativeModel(self.model_name)

    def generate_response(self, messages: List[Dict], temperature: float = 0.7) -> Dict:
        """Generate a response using the Gemini API."""
        try:
            prompt = "\n".join(f"{m['role']}: {m['content']}" for m in messages if m.get('content'))
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": 2000,
                },
            )

            content = response.text if hasattr(response, "text") else ""
            return {
                "content": content,
                "tokens_used": getattr(response, "usage_metadata", None).total_token_count if getattr(response, "usage_metadata", None) else 0,
                "model": self.model_name,
                "success": True,
            }
        except Exception as e:
            return {
                "content": None,
                "error": str(e),
                "success": False,
            }

    def set_model(self, model_name: str):
        """Change the Gemini model name."""
        self.model_name = model_name
        self.model = genai.GenerativeModel(self.model_name)
