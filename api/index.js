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



// Multer setup for handling file uploads
/* const upload = multer({ 
    dest: 'uploads/', 
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        cb(null, file.originalname);
      }
    })
});
 */
const upload = multer({ storage: multer.memoryStorage() });
  

// Function to get the next group index
let groupIndexes = new Map();
const getNextGroupIndex = async (group) => {
    group = group.toUpperCase();

    if (!groupIndexes.has(group)) {
        const lastCustomer = await Customer.findOne({ group })
            .sort({ group_index: -1 })
            .select("group_index");
        groupIndexes.set(group, lastCustomer ? lastCustomer.group_index : 0);
    }

    const nextIndex = groupIndexes.get(group) + 1;
    groupIndexes.set(group, nextIndex);
    return nextIndex;
};

// Sanitize customer data and assign group_index
const sanitizeCustomerData = async (customer) => {
    const group = customer.reg_number ? customer.reg_number.replace(/[0-9]/g, '').toUpperCase() : "Nill";
    const group_index = await getNextGroupIndex(group);

    return {
        name: customer.name && customer.name.trim() !== "" ? customer.name : "Unknown",
        phone: customer.phone && customer.phone.trim() !== "" ? customer.phone : "0000000000",
        address: customer.address && customer.address.trim() !== "" ? customer.address : "N/A",
        group,
        group_index,
        regDate: customer.date ? new Date(customer.date) : new Date(customer.reg_date),
    };
};

// Sanitize transactions
const sanitizeTransactionData = (transaction, ownerId, uniqueTransactions) => {
    const amount = Number(transaction.amount);
    if (isNaN(amount) || amount <= 0) return null;

    const transactionDate = transaction.date ? new Date(transaction.date) : new Date();
    const uniqueKey = `${amount}-${transaction.type}-${transactionDate.toISOString()}`;

    if (uniqueTransactions.has(uniqueKey)) return null;
    uniqueTransactions.add(uniqueKey);

    return {
        owner: ownerId,
        amount,
        type: ["deposit", "withdrawal"].includes(transaction.type) ? transaction.type : "deposit",
        date: transactionDate
    };
};

// API Endpoint to Upload and Process JSON File
app.post('/api/import-customers', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Parse the JSON data directly from memory (buffer)
        let customers = JSON.parse(req.file.buffer.toString());

        let customerDocs = [];
        let transactionDocs = [];

        for (let customer of customers) {
            const { id, reg_number, balance, transactions, ...rest } = customer;

            let sanitizedCustomer = await sanitizeCustomerData(customer);
            let newCustomer = new Customer(sanitizedCustomer);
            let savedCustomer = await newCustomer.save();
            customerDocs.push(savedCustomer);

            let uniqueTransactions = new Set();

            for (let transaction of transactions) {
                const { id, time, ...transRest } = transaction;
                let sanitizedTransaction = sanitizeTransactionData(transRest, savedCustomer._id, uniqueTransactions);
                
                if (sanitizedTransaction) {
                    transactionDocs.push(sanitizedTransaction);
                }
            }
        }

        if (transactionDocs.length > 0) {
            await Transaction.insertMany(transactionDocs);
        }

        res.status(201).json({ message: 'Customers and transactions imported successfully' });

        // Reset group index tracking
        groupIndexes = new Map();
    } catch (error) {
        console.error('Error importing data:', error);
        res.status(500).json({ message: 'Error processing data' });
    }
});


// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


module.exports = app;