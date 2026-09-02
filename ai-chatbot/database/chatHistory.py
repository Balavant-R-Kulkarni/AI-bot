from pathlib import Path
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

class ChatHistory:
    def __init__(self):
        mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/chatbot")
        database_name = os.getenv("MONGODB_DB", "chatmessage")
        self.client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=20000)
        self.db = self.client[database_name]
        self.conversations = self.db["conversations"]
        self.messages = self.db["messages"]
        
    def _convert_id(self, doc):
        """Convert MongoDB ObjectId to string"""
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc
    
    def create_conversation(self, user_id: str, title: str = "New Chat") -> str:
        """Create new conversation"""
        conversation = {
            "user_id": user_id,
            "title": title,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "message_count": 0
        }
        result = self.conversations.insert_one(conversation)
        return str(result.inserted_id)
    
    def add_message(self, conversation_id: str, role: str, content: str, tokens_used: int = 0):
        """Add message to conversation"""
        try:
            conv_id = ObjectId(conversation_id) if not isinstance(conversation_id, ObjectId) else conversation_id
        except:
            conv_id = conversation_id
            
        message = {
            "conversation_id": conversation_id,
            "role": role,  # "user" or "assistant"
            "content": content,
            "timestamp": datetime.now(),
            "tokens_used": tokens_used
        }
        self.messages.insert_one(message)
        
        # Update conversation updated_at and message_count
        try:
            self.conversations.update_one(
                {"_id": ObjectId(conversation_id)},
                {
                    "$set": {"updated_at": datetime.now()},
                    "$inc": {"message_count": 1}
                }
            )
        except:
            pass
    
    def get_conversation_history(self, conversation_id: str) -> List[Dict]:
        """Get all messages in a conversation"""
        messages = list(self.messages.find(
            {"conversation_id": conversation_id},
            sort=[("timestamp", 1)]
        ))
        # Convert ObjectIds to strings
        for msg in messages:
            if "_id" in msg:
                msg["_id"] = str(msg["_id"])
        return messages
    
    def get_user_conversations(self, user_id: str) -> List[Dict]:
        """Get all conversations for a user"""
        conversations = list(self.conversations.find(
            {"user_id": user_id},
            sort=[("updated_at", -1)]
        ))
        # Convert ObjectIds to strings
        for conv in conversations:
            if "_id" in conv:
                conv["_id"] = str(conv["_id"])
        return conversations
    
    def delete_conversation(self, conversation_id: str):
        """Delete conversation and all its messages"""
        try:
            self.messages.delete_many({"conversation_id": conversation_id})
            self.conversations.delete_one({"_id": ObjectId(conversation_id)})
        except:
            pass
