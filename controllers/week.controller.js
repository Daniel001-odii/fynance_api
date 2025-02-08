const Week = require('../models/week.model');
const Customer = require('../models/customers.model');
const Transaction = require('../models/transaction.model');

// Controller to create a new week
exports.createNewWeek = async (req, res) => {
    try {
        const newWeek = new Week({
            deposits: [
                { txn: [] },
                { txn: [] },
                { txn: [] },
                { txn: [] },
                { txn: [] }
            ],
            withdrawals: [
                { txn: [] },
                { txn: [] },
            ]
        });

        await newWeek.save();

        res.status(201).json({
            success: true,
            message: 'New week created successfully',
            data: newWeek
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating new week',
            error: error.message
        });
    }
};

// make deposit for a customer for a particular week
exports.makeDeposit = async (req, res) => {
    try {
        const { week_id, deposit_id, customer_id} = req.query;
        const { amount } = req.body;

        const week = await Week.findById(week_id);
        if (!week) {
            return res.status(404).json({
                success: false,
                message: 'Week not found'
            });
        }

        const customer = await Customer.findById(customer_id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const deposit = week.deposits.find(deposit => deposit._id.toString() === deposit_id);
        if (!deposit) {
            return res.status(404).json({
                success: false,
                message: 'Deposit not found'
            });
        }
        
        // check if the customer has already made a deposit for this week
        const existingDeposit = await Transaction.findOne({ _id: { $in: deposit.txn }, customer: customer_id });
        if (existingDeposit) {
            return res.status(400).json({
                success: false,
                message: 'Customer has already made a deposit for this week'
            });
        }

        // Create a new transaction
        const transaction = new Transaction({
            customer: customer_id,
            amount: amount,
            type: 'deposit'
        });

        // Save the transaction
        const savedTransaction = await transaction.save();

        // Add the deposit to the week at the specified deposit_id
        deposit.txn.push(savedTransaction._id);

        await week.save();

        res.status(200).json({
            success: true,
            message: 'Deposit made successfully',
            data: week
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error making deposit',
            error: error.message
        });
    }
}

// write a withdrawal for a customer for a particular week
exports.makeWithdrawal_1 = async (req, res) => {
    try {
        const { week_id, withdrawal_id, customer_id} = req.query;
        const { amount } = req.body;

        // check if the customer has enough balance to make a withdrawal
        const customer = await Customer.findById(customer_id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Find the week
        const week = await Week.findById(week_id);
        if (!week) {
            return res.status(404).json({
                success: false,
                message: 'Week not found'
            });
        }

        const withdrawal = week.withdrawals.find(withdrawal => withdrawal._id.toString() === withdrawal_id);
        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                message: 'Withdrawal not found'
            });
        }

        // check if the customer has already made a withdrawal for this week
        const existingWithdrawal = await Transaction.findOne({ _id: { $in: withdrawal.txn }, customer: customer_id });
        if (existingWithdrawal) {
            return res.status(400).json({
                success: false,
                message: 'Customer has already made a withdrawal for this week'
            });
        }

        // Create a new transaction
        const transaction = new Transaction({
            customer: customer_id,
            amount: amount,
            type: 'withdrawal'
        });

        // Save the transaction
        const savedTransaction = await transaction.save();

       /*  // Update customer balance
        customer.balance -= amount;
        await customer.save(); */

        // Add the withdrawal to the week at the specified withdrawal_id
        withdrawal.txn.push(savedTransaction._id);

        await week.save();

        res.status(200).json({
            success: true,
            message: 'Withdrawal made successfully',
            data: week
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error making withdrawal',
            error: error.message
        });
    }
}

// get all transactions for a week
exports.getAllTransactions = async (req, res) => {
    try {
        const { week_id } = req.query;
        
        // Validate week_id is provided
        if (!week_id) {
            return res.status(400).json({
                success: false,
                message: 'Week ID is required'
            });
        }

        // Find week and populate transactions in one query
        const week = await Week.findById(week_id)
            .populate({
                path: 'deposits.txn',
                populate: {
                    path: 'transaction',
                    model: 'Transaction'
                }
            })
            .populate({
                path: 'withdrawals.txn',
                populate: {
                    path: 'customer', 
                    model: 'Customer'
                }
            });

        if (!week) {
            return res.status(404).json({
                success: false,
                message: 'Week not found'
            });
        }

        res.status(200).json({
            success: true,
            week: week
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'Error getting all transactions',
            error: error.message
        });
    }
}

// controller to get a week by id
exports.getWeekById = async (req, res) => {
    const week_id = req.params.id;
    if(!week_id) {
        return res.status(400).json({
            success: false,
            message: 'Week ID is required'
        });
    }

    // get the week by id
    const week = await Week.findOne({ _id: week_id });
    if(!week) {
        return res.status(404).json({
            success: false,
            message: 'Week not found'
        });
    };

    res.status(200).json({
        success: true,
        data: week
    });
}
