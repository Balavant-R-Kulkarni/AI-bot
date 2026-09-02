const express = require('express')
const path = require('path')
const db = require('./db')
const authRoute = require('./routes/authroute')
const cors = require('cors')
const proxy = require('express-http-proxy')

db()

const app = express()

const cors_options = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use(cors(cors_options))

// Auth routes
app.use('/auth', authRoute)

// Verify token middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization required' })
    }
    next()
}

// Proxy requests to FastAPI - all /api/chat/* routes
app.use('/api/chat', verifyToken, proxy('http://localhost:8000', {
    proxyReqPathResolver: (req) => {
        // req.url only contains path after /api/chat (e.g., /conversations)
        // We need to prepend /chat for FastAPI routes
        const path = `/chat${req.url}`
        console.log(`🔄 Proxying: /api/chat${req.url} → ${path}`)
        return path
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err.message)
        res.status(500).json({ message: 'AI Service unavailable', error: err.message })
    }
}))

app.listen(5000, () => {
    console.log('✅ Express Server started on port 5000')
})