# AI Chatbot Project Setup Guide

This repository has 3 main parts:

1. `client/` — React frontend UI
2. `server/` — Express backend and auth API
3. `ai-chatbot/` — FastAPI AI service that talks to Gemini and MongoDB

---

## Project structure

```text
F:\MERN\
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
│
├── server/                  # Express API + JWT auth gateway
│   ├── app.js
│   ├── db.js
│   ├── package.json
│   ├── controller/
│   │   └── authController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── model/
│   │   └── authModel.js
│   ├── routes/
│   │   └── authroute.js
│   └── public/
│       ├── index.html
│       └── chat.html
│
├── ai-chatbot/              # FastAPI AI chatbot backend
│   ├── main.py
│   ├── requirements.txt
│   ├── routes/
│   │   └── chat.py
│   ├── models/
│   │   └── chatModel.py
│   ├── database/
│   │   └── chatHistory.py
│   └── README.md
│
├── SETUP_GUIDE.md
└── .gitignore
```

---

## 1. Client folder (`client/`)

This is the React frontend used by the browser.

### Purpose
- user login/register screen
- dashboard for token management
- chat UI with sidebar and message area
- calls to the Express server

### Important files

#### `client/src/App.tsx`
This is the main React app file. It contains:
- auth state for login/register
- token storage and expiration checks
- conversation loading and message sending
- chat title editing logic
- UI screens for auth and chat

#### `client/src/App.css`
Contains the styling for:
- login/register page
- dashboard card layout
- chat sidebar
- message bubbles
- textarea, buttons, and responsive layout

#### `client/src/index.css`
Global base styles for the Vite app.

### Frontend runtime
```powershell
cd F:\MERN\client
npm install
npm run dev
```
The app usually runs on:
```text
http://localhost:5173
```

### What it does
It sends requests to the backend like:
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `GET /api/chat/conversations`
- `POST /api/chat/message`

---

## 2. Server folder (`server/`)

This is the Node.js/Express backend. It is the main gateway and authentication layer.

### Purpose
- handles user registration/login
- manages JWT tokens
- protects routes with auth middleware
- proxies chat requests from frontend to Python AI service

### Important files

#### `server/app.js`
Main Express app file.

It does the following:
- starts Express on port `5000`
- enables CORS
- mounts auth routes under `/auth`
- protects chat routes with a token check
- proxies `/api/chat` requests to the Python FastAPI server at `http://localhost:8000`

Example proxy logic:
```js
app.use('/api/chat', verifyToken, proxy('http://localhost:8000', {
  proxyReqPathResolver: (req) => `/chat${req.url}`
}))
```
This is important because the frontend calls `/api/chat/...`, but the AI backend expects `/chat/...`.

#### `server/routes/authroute.js`
Defines app routes like:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/user/:id`
- `GET /auth/users`

#### `server/controller/authController.js`
Contains the logic for:
- register user
- login user
- refresh JWT access token
- get user data and list users

#### `server/middleware/authMiddleware.js`
Validates JWT before protected routes are accessed.

#### `server/model/authModel.js`
Handles database-level user model logic, usually for MongoDB operations.

#### `server/db.js`
Connects to MongoDB and sets database connection configuration.

### Server runtime
```powershell
cd F:\MERN\server
npm install
npm run dev
```
Server runs on:
```text
http://localhost:5000
```

---

## 3. AI Chatbot folder (`ai-chatbot/`)

This is the Python AI service built with FastAPI.

### Purpose
- receives chat requests from Express
- validates JWT token
- gets previous conversation history from MongoDB
- sends the conversation to Gemini model
- stores new messages back in MongoDB
- returns AI output to the client through the server gateway

### Important files

#### `ai-chatbot/main.py`
This is the entry point of the Python app.

It creates the FastAPI app and includes the router:
```python
app.include_router(chat_router, prefix="/chat")
```
It also sets up:
- CORS
- JWT verification
- health route
- server start on port `8000`

#### `ai-chatbot/routes/chat.py`
This is the most important file in the AI service.

It defines routes such as:
- `POST /chat/message`
- `GET /chat/conversations`
- `GET /chat/history/{conversation_id}`
- `POST /chat/new-conversation`
- `DELETE /chat/conversation/{conversation_id}`

Important internal flow:
```python
user_data = verify_token(authorization)
user_id = user_data.get("id")

if not request.conversation_id:
    request.conversation_id = db.create_conversation(user_id)

history = db.get_conversation_history(request.conversation_id)
messages = [...system prompt + previous messages + new message]
result = chat_model.generate_response(messages, request.temperature)

# save user and assistant messages
```

#### `ai-chatbot/models/chatModel.py`
This file wraps the Gemini AI integration.

It does:
- loads `GEMINI_API_KEY` from `.env`
- configures `google.generativeai`
- calls the model with conversation text
- returns generated response + token count
- handles errors cleanly

Example return object:
```python
{
    "content": "...",
    "tokens_used": 120,
    "model": "gemini-3.6-flash",
    "success": True,
}
```

#### `ai-chatbot/database/chatHistory.py`
This file manages MongoDB database storage.

It handles:
- creating conversation records
- inserting user/assistant messages
- retrieving conversation history
- listing conversations for each user
- deleting a full conversation

Example functions:
- `create_conversation(user_id, title="New Chat")`
- `add_message(conversation_id, role, content, tokens_used=0)`
- `get_conversation_history(conversation_id)`
- `get_user_conversations(user_id)`
- `delete_conversation(conversation_id)`

### Python runtime
```powershell
cd F:\MERN\ai-chatbot
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
AI service runs on:
```text
http://localhost:8000
```

---

## 3-layer request flow

Here is the full flow of a request:

```text
React frontend (client)
    ↓
Express server (server)
    ↓
JWT auth check
    ↓
Proxy to FastAPI (/chat/...)
    ↓
FastAPI verifies token again
    ↓
MongoDB loads chat history
    ↓
Gemini generates response
    ↓
MongoDB saves message(s)
    ↓
Response sent back to React UI
```

Example:
```text
client -> POST /api/chat/message
server -> proxy to http://localhost:8000/chat/message
ai-chatbot -> validates JWT + gets chat context + calls Gemini
server -> sends result back to frontend
```

---

## Environment variables

### `server/.env`
```env
JWT_SECRET=your_secret_key
MONGODB_URI=mongodb://localhost:27017/mern
```

### `ai-chatbot/.env`
```env
JWT_SECRET=your_secret_key
MONGODB_URI=mongodb://localhost:27017/chatbot
MONGODB_DB=chatmessage
GEMINI_API_KEY=your_google_gemini_key
```

Important:
- `JWT_SECRET` should match between Express and Python
- `GEMINI_API_KEY` is used by the AI service
- MongoDB must be running for chat history to work

---

## Database structure

### `server` DB (users)
```json
{
  "_id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "hashed_password"
}
```

### AI DB (`chatmessage` database)

#### `conversations`
```json
{
  "_id": "...",
  "user_id": "user_id",
  "title": "New Chat",
  "created_at": "2026-09-01T00:00:00",
  "updated_at": "2026-09-01T00:15:00",
  "message_count": 4
}
```

#### `messages`
```json
{
  "_id": "...",
  "conversation_id": "...",
  "role": "user",
  "content": "Hello",
  "timestamp": "2026-09-01T00:02:00",
  "tokens_used": 50
}
```

---

## Startup order

To run everything correctly, start in this order:

### 1. MongoDB
Make sure your MongoDB instance is running.

### 2. AI backend
```powershell
cd F:\MERN\ai-chatbot
venv\Scripts\activate
python main.py
```

### 3. Express backend
```powershell
cd F:\MERN\server
npm install
npm run dev
```

### 4. React frontend
```powershell
cd F:\MERN\client
npm install
npm run dev
```

---

## Notes about recent updates

- The frontend has been converted from static HTML into a React app in `client/src/App.tsx`.
- The UI supports login, registration, token checking, and chat conversation management.
- Chat titles can be edited in the UI using the pencil icon in the chat header.
- The Express server acts as the API gateway to the Python AI service.
- The AI backend uses Gemini, not OpenAI, in the current code.

---

## Troubleshooting

### React app does not start
- make sure Node version is 22+ or at least supported by Vite
- run `npm install` again
- remove `node_modules` if necessary and reinstall

### Express server fails
- check if MongoDB is running
- confirm `.env` variables exist
- verify `JWT_SECRET` is valid

### FastAPI fails
- activate the venv
- ensure `GEMINI_API_KEY` is set
- verify MongoDB connection details

### Chat API returns 401 or 403
- verify the frontend sends `Authorization: Bearer <token>`
- ensure both backend services share the same JWT secret

---

## Final summary

The project is split cleanly into 3 layers:

- `client/` = frontend UI
- `server/` = authentication and API gateway
- `ai-chatbot/` = AI processing and history storage

This keeps the app modular and easier to maintain as the project grows.
