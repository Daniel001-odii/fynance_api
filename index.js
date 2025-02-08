const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const customerRoutes = require('./routes/customers.routes');
const weekRoutes = require('./routes/week.routes');
const transactionRoutes = require('./routes/transacation.routes');

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ledger_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to LedgerApp DB'))
.catch(err => console.error('Could not connect to MongoDB:', err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Register customer routes
app.use('/api/customers', customerRoutes);
// app.use('/api/weeks', weekRoutes);
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
