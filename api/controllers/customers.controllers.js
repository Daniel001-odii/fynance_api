const Customer = require('../models/customers.model');
const Transaction = require('../models/transaction.model');

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    // const customer = new Customer(req.body);
    const {
        name,
        group,
        regDate,
        address,
        phone,
        group_index,
    } = req.body;

    if(!name || !group || !address || !group_index){
        return res.status(400).json({message: "All fields are required"});
    }

    // if phone number is provided then use, else use 0000
    const default_phone = phone ? phone : "0000";

    // make sure group_index is number and is unique
    const existingGroupIndex = await Customer.findOne({ group, group_index });
    if(existingGroupIndex){
      return res.status(400).json({ message: "Customer with group index already exists"});
    }

    if(!Number(group_index) || Number(group_index) < 0){
      return res.status(400).json({ message: "invalid group index"});
    }

    if(Number(group_index > 20)){
      return res.status(400).json({ message: "Sorry maximum customers per group reached"});
    }

    // check for existing customer by name
    const existingCustomer = await Customer.findOne({ name });
    if(existingCustomer){
        return res.status(400).json({message: "Customer with name already exists"});
    }

    const customer = new Customer({
        name,
        group: group.toUpperCase(),
        group_index,
        regDate,
        address, 
        phone: default_phone,
    });

    const savedCustomer = await customer.save();

    res.status(201).json(savedCustomer);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};


// / Get a single customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get all transactions for this customer sorted by date
    const transactions = await Transaction.find({ owner: req.params.id })
      .sort({ date: 1 });

    const depositTransactions = await Transaction.find({ owner: req.params.id, type: 'deposit' });
    const withdrawalTransactions = await Transaction.find({ owner: req.params.id, type: 'withdrawal' });

    const total_deposits = depositTransactions.reduce((acc, t) => acc + t.amount, 0);
    const total_withdrawals = withdrawalTransactions.reduce((acc, t) => acc + t.amount, 0);

    // Calculate balance by summing deposits and subtracting withdrawals
    const balance = transactions.reduce((total, txn) => {
      if (txn.type === 'deposit') {
        return total + Number(txn.amount);
      } else {
        return total - Number(txn.amount);
      }
    }, 0);

    // Add transactions and balance to customer object
    const customerWithTransactions = {
      ...customer.toObject(),
      transactions,
      balance,
      no_of_deposits: depositTransactions.length,
      no_of_withdrawals: withdrawalTransactions.length,
      total_deposits,
      total_withdrawals,
    };

    res.status(200).json({ customer: customerWithTransactions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Update a customer
exports.updateCustomer = async (req, res) => {
  try {
    // const { name, group, address, phone, regDate, balance } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(200).json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a customer
exports.deleteCustomer = async (req, res) => {
  try {
    // Find and delete the customer's transactions first
    await Transaction.deleteMany({ owner: req.params.id });

    // Find and delete the customer
    const customer = await Customer.findByIdAndDelete(req.params.id);

    // If customer doesn't exist
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({ message: 'Customer and related transactions deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting customer data' });
  }
};


// GET ALL GROUPS..
exports.getUniqueCustomerGroups = async (req, res) => {
    try {
        // Find all customers and extract unique regGroups
        const customers = await Customer.find();
        let uniqueGroups = [...new Set(customers.map(customer => customer.group ))]; 

        if(uniqueGroups.length === 0){
            uniqueGroups = ['A']
        }

        

        res.status(200).json({
            groups: uniqueGroups.sort()
        });
    } catch (error) {
        console.error('Error in getUniqueCustomerGroups:', error);
        res.status(500).json({
            message: 'Failed to fetch unique customer groups',
            error: error.message
        });
    }
}



  

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

exports.uploadCustomFile = async (req, res) => {
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
};
