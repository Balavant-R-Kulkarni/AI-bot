#!/usr/bin/env python3
"""
Quick debug script to test the chatbot API
"""

import requests
import json
import sys

API_BASE = "http://localhost:5000"

def test_auth():
    """Test authentication"""
    print("🔐 Testing Authentication...")
    
    # Register
    reg_data = {
        "name": "Test User",
        "email": f"test_{int(__import__('time').time())}@example.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/register", json=reg_data, timeout=5)
        if response.status_code == 201:
            token = response.json()['token']
            print(f"✅ Auth: OK (got token)")
            return token
        else:
            print(f"❌ Auth: Failed - {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Auth: Connection failed - {e}")
        return None

def test_chat_api(token):
    """Test chat API"""
    print("\n💬 Testing Chat API...")
    
    if not token:
        print("❌ No token available")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create conversation
    try:
        response = requests.post(
            f"{API_BASE}/api/chat/new-conversation",
            headers=headers,
            timeout=5
        )
        if response.status_code == 200:
            conv_id = response.json()['conversation_id']
            print(f"✅ Create Conversation: OK (ID: {conv_id})")
        else:
            print(f"❌ Create Conversation: Failed - {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Create Conversation: Connection failed - {e}")
        return False
    
    # Send message
    try:
        message_data = {
            "message": "Hello, what is AI?",
            "conversation_id": conv_id
        }
        response = requests.post(
            f"{API_BASE}/api/chat/message",
            headers=headers,
            json=message_data,
            timeout=30  # API calls can take time
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Send Message: OK")
            print(f"   AI Response: {result['message'][:100]}...")
            print(f"   Tokens used: {result['tokens_used']}")
            return True
        else:
            print(f"❌ Send Message: Failed - {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Send Message: Failed - {e}")
        return False

def main():
    print("=" * 50)
    print("🤖 AI CHATBOT API DEBUG TEST")
    print("=" * 50)
    
    print("\n📍 Checking servers...")
    
    # Check Express
    try:
        requests.get("http://localhost:5000", timeout=2)
        print("✅ Express (5000): Running")
    except:
        print("❌ Express (5000): NOT running")
        print("   Start with: cd F:\\MERN\\server && npm run dev")
        return
    
    # Check FastAPI
    try:
        response = requests.get("http://localhost:8000/health", timeout=2)
        print("✅ FastAPI (8000): Running")
    except:
        print("❌ FastAPI (8000): NOT running")
        print("   Start with: cd F:\\MERN\\ai-chatbot && python main.py")
        return
    
    # Test auth
    token = test_auth()
    if not token:
        return
    
    # Test chat
    success = test_chat_api(token)
    
    print("\n" + "=" * 50)
    if success:
        print("✅ ALL TESTS PASSED - Chatbot is working!")
    else:
        print("❌ Some tests failed - Check errors above")
    print("=" * 50)

if __name__ == "__main__":
    main()
