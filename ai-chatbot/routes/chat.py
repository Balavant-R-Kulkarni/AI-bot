from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import jwt
import os
from models.chatModel import ChatModel
from database.chatHistory import ChatHistory

chat_router = APIRouter()
chat_model = ChatModel()
db = ChatHistory()

# Pydantic Models
class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    temperature: Optional[float] = 0.7

class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    timestamp: datetime
    tokens_used: int
    success: bool

class ConversationResponse(BaseModel):
    conversation_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int

def verify_token(authorization: str):
    """Verify JWT token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    try:
        token = authorization.split(" ")[1]
        decoded = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        return decoded
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid token: {str(e)}"
        )

# Routes

@chat_router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    authorization: str = Header(None)
):
    """Send message to AI and get response"""
    
    # Verify user
    user_data = verify_token(authorization)
    user_id = user_data.get("id")
    
    # Create new conversation if needed
    if not request.conversation_id:
        request.conversation_id = db.create_conversation(user_id)
    
    # Get conversation history
    history = db.get_conversation_history(request.conversation_id)
    
    # Prepare messages for OpenAI (system prompt + history + new message)
    messages = [
        {
            "role": "system",
            "content": "You are a helpful AI assistant similar to Gemeni. Provide concise, accurate, and helpful responses."
        }
    ]
    
    # Add previous messages
    for msg in history:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    # Add new user message
    messages.append({
        "role": "user",
        "content": request.message
    })
    
    # Get AI response
    result = chat_model.generate_response(messages, request.temperature)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    # Save user message
    db.add_message(request.conversation_id, "user", request.message)
    
    # Save AI response
    db.add_message(request.conversation_id, "assistant", result["content"], result["tokens_used"])
    
    return ChatResponse(
        conversation_id=request.conversation_id,
        message=result["content"],
        timestamp=datetime.now(),
        tokens_used=result["tokens_used"],
        success=True
    )

@chat_router.get("/conversations")
async def get_conversations(authorization: str = Header(None)):
    """Get all conversations for user"""
    
    user_data = verify_token(authorization)
    user_id = user_data.get("id")
    
    conversations = db.get_user_conversations(user_id)
    return {"conversations": conversations}

@chat_router.get("/history/{conversation_id}")
async def get_conversation_history(
    conversation_id: str,
    authorization: str = Header(None)
):
    """Get messages from specific conversation"""
    
    verify_token(authorization)  # Just verify user is authenticated
    
    messages = db.get_conversation_history(conversation_id)
    return {"messages": messages}

@chat_router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    authorization: str = Header(None)
):
    """Delete a conversation"""
    
    verify_token(authorization)
    
    db.delete_conversation(conversation_id)
    return {"message": "Conversation deleted", "conversation_id": conversation_id}

@chat_router.post("/new-conversation")
async def create_new_conversation(
    title: str = "New Chat",
    authorization: str = Header(None)
):
    """Create new conversation"""
    
    user_data = verify_token(authorization)
    user_id = user_data.get("id")
    
    conversation_id = db.create_conversation(user_id, title)
    return {"conversation_id": conversation_id, "title": title}
