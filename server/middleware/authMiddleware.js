const jwt = require("jsonwebtoken");
const User = require("../model/authModel");


const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header is required' });
        }
        
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token is required' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);
        const user = await User.findById(decoded.id);
        if (!user) {
            throw new Error('User not found');
        }
        req.user = user;
        console.log('Authenticated user:', user);
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Please authenticate', error: error.message });
    }
};

module.exports = authMiddleware;