const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const customerRoutes = require('../routes/customers.routes');
const transactionRoutes = require('../routes/transacation.routes');
require('dotenv').config();


const app = express();
const port = process.env.PORT || 3000;

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const Customer = require('./models/customers.model')
const Transaction = require('./models/transaction.model')

// Configure CORS
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://fynance-alpha.vercel.app',
  ],// Specify your frontend URL
  credentials: true // Enable credentials
};

// Use the cors middleware with options to specify the allowed origin [----DO NOT REMOVE FRPM HERE----]
// app.use(cors(corsOptions));
// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://fynance-alpha.vercel.app',
    ], // Allow only your frontend
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization'
}));


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to LedgerApp DB'))
.catch(err => console.error('Could not connect to MongoDB:', err));



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Register customer routes
app.use('/api/customers', customerRoutes);
app.use('/api/txns', transactionRoutes);



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});



// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


module.exports = app;