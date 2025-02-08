const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const customerRoutes = require('./routes/customers.routes');
const weekRoutes = require('./routes/week.routes');
const transactionRoutes = require('./routes/transacation.routes');

const app = express();
const port = process.env.PORT || 3000;


const fs = require('fs');
const path = require('path');


const Customer = require('./models/customers.model')
const Transaction = require('./models/transaction.model')

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


const sanitizeCustomerData = (customer) => {
  return {
      name: customer.name && customer.name.trim() !== "" ? customer.name : "Unknown",
      phone: customer.phone && customer.phone.trim() !== "" ? customer.phone : "0000000000",
      address: customer.address && customer.address.trim() !== "" ? customer.address : "N/A",
      group: customer.reg_number ? customer.reg_number.replace(/[0-9]/g, '') : "A",
      // regNo: customer.reg_number ? customer.reg_number.replace(/[0-9]/g, '') : "N/A",
      // regDate: customer.date ? new Date(customer.date) : new Date()
      regDate: customer.date ? new Date(customer.date) : new Date(customer.reg_date),
  };
};

// Utility function to sanitize transactions
const sanitizeTransactionData = (transaction, ownerId) => {
  return {
      owner: ownerId,
      // amount: typeof transaction.amount === "number" ? transaction.amount : 0,
      amount: Number(transaction.amount),
      type: ["deposit", "withdrawal"].includes(transaction.type) ? transaction.type : "deposit",
      date: transaction.date ? new Date(transaction.date) : new Date()
  };
};

app.post('/import-customers', async (req, res) => {
  try {
      const filePath = path.join(__dirname, 'customers-data.json'); // Update with correct path
      const rawData = fs.readFileSync(filePath);
      let customers = JSON.parse(rawData);

      let customerDocs = [];
      let transactionDocs = [];

      for (let customer of customers) {
          const { id, reg_number, balance, transactions, ...rest } = customer;
          // const { id, group, balance, transactions, ...rest } = customer;

          let sanitizedCustomer = sanitizeCustomerData(customer);
          let newCustomer = new Customer(sanitizedCustomer);
          let savedCustomer = await newCustomer.save();
          customerDocs.push(savedCustomer);

          for (let transaction of transactions) {
              const { id, time, ...transRest } = transaction;
              let sanitizedTransaction = sanitizeTransactionData(transRest, savedCustomer._id);
              transactionDocs.push(sanitizedTransaction);
          }
      }

      // Insert transactions in bulk
      if (transactionDocs.length > 0) {
          await Transaction.insertMany(transactionDocs);
      }

      res.status(201).json({ message: 'Customers and transactions imported successfully' });
  } catch (error) {
      console.error('Error importing data:', error);
      res.status(500).json({ message: 'Error processing data' });
  }
});


// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
