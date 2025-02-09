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

    if(!name || !group || !address || !phone || !group_index){
        return res.status(400).json({message: "All fields are required"});
    }

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
        phone    
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