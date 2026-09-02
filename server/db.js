require('dotenv').config()
const mongoose = require('mongoose')

const mongoURI = 'mongodb+srv://kbrk878_db_user:DEZMjzmKbSJ0HDZ5@cluster0.ygiu4wq.mongodb.net/mernapp?retryWrites=true&w=majority'

async function connectDB() {
    try {
        await mongoose.connect(mongoURI, {
            dbName: 'mernapp'
        })
        console.log('Connected to mernapp database')
    } catch (error) {
        console.log('error', error)
        process.exit(1)
    }
}

module.exports = connectDB
