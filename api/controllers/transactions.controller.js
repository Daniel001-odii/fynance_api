const Transaction = require('../models/transaction.model');
const Customer = require('../models/customers.model');


/* ensure only one transaction is created per day per customer
make sure calculated available balance is sufficient for every withdrawal transaction */


function getWeekRange(date) {
    const givenDate = new Date(date);

    // Clone the date to avoid modifying the original
    const startOfWeek = new Date(givenDate);

    // Adjust to Monday (assuming week starts on Monday)
    const day = startOfWeek.getDay();

    // In JavaScript, Sunday is 0, Monday is 1, etc.
    // day === 0 ? 1 : (day === 1 ? 0 : 7 - day);
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);

    // Set time to beginning of day
    startOfWeek.setHours(0, 0, 0, 0);
  
    // End of week is Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    console.log("start of week: ", startOfWeek)
    console.log("end of week: ", endOfWeek)
  
    return { startOfWeek, endOfWeek };
}

function calculateBalance(transactions) {
    // Calculate available balance by summing deposits and subtracting withdrawals
    const calculatedAvailableBalance = transactions.reduce((balance, txn) => {
        // Convert amount to number and handle null/undefined
        const amount = Number(txn.amount) || 0;
        
        if (txn.type === 'deposit') {
            return balance + amount;
        } else if (txn.type === 'withdrawal') {
            return balance - amount;
        }
        return balance; // Handle any other transaction types
    }, 0);

    console.log("calculated available balance: ", calculatedAvailableBalance)
    return calculatedAvailableBalance;
}

exports.createTransaction = async (req, res) => {
    try{
        const { owner } = req.query;

        const { amount, type, date } = req.body;

        if(!owner || !amount || !type || !date){
            return res.status(400).json({message: "All fields are required"});
        }
        // make sure amount is of type number and not negative
        if(isNaN(amount) || amount < 0 || amount == 0){
            return res.status(400).json({message: "invalid amount"});
        }

        // make sure type is either deposit or withdrawal
        if(type !== 'deposit' && type !== 'withdrawal'){
            return res.status(400).json({message: "invalid transaction type"});
        }
        

        const customer = await Customer.findById(owner);
        if(!customer){
            return res.status(404).json({message: "Customer not found"});
        }

        // check if the customer has a transaction for the same day
        const existingTransaction = await Transaction.findOne({ owner, date, type });
        if(existingTransaction){
            return res.status(400).json({message: "Transaction already exists for this day"});
        };

        // Get all transactions for this customer
        const allTransactions = await Transaction.find({ owner });

        // Calculate available balance by summing deposits and subtracting withdrawals
        const calculatedAvailableBalance = allTransactions.reduce((balance, txn) => {
            if(txn.type === 'deposit') {
                return balance + Number(txn.amount);
            } else {
                return balance - Number(txn.amount); 
            }
        }, 0);


        // txns veririfcations..
        // Get the week range for the transaction date
        const { startOfWeek, endOfWeek } = getWeekRange(date);
        // Define the limits for each transaction type
        const limits = {
            withdrawal: 2,
            deposit: 5,
        };

        // Query the count of transactions of this type for the customer in this week
        const count = await Transaction.countDocuments({
            owner: owner,
            type: type,
            date: { $gte: startOfWeek, $lte: endOfWeek },
        });

        console.log("document counts: ", count)

        if (count >= limits[type]) {
            // Limit reached, so return or throw an error
            return res.status(400).json({
                message: `You have reached the weekly limit for ${type}s.`
            });
        }


        // if the transaction is a withdrawal, check if the available balance is sufficient
        if(type === 'withdrawal'){
            // Check if withdrawal amount exceeds available balance
            if(amount > calculatedAvailableBalance) {
                return res.status(400).json({
                    message: "Insufficient funds for withdrawal",
                    availableBalance: calculatedAvailableBalance
                });
            }
        }

        const transaction = new Transaction({ owner, amount, type, date });
        await transaction.save();
        res.status(201).json({ transaction, balance: calculatedAvailableBalance });
    }catch(error){
        console.log(error);
        res.status(500).json({message: error.message});
    }
}

/* 
    use a "group" query to return a group of customers which is first letter of regNo or alphabet(s) of regNo before number
    returned by weekly basis, where week index is index of week in a transaction month is provided in query
    returned accordingly from Mon - saturday for provided week with empty transaction objects for each day for customers who have not made any transactions for that that in the provided week
    return balance for each customer respectively
    return the date in form  of dd/mm/yyyy for all day b/w Mon - saturday for provided week
    properly return the sum total of all deposits and withdrawals for each day(date) of the week in a different array called maybe "weekTotals"
    let returned data/ response be in form 
    customers: [
        {
            regNo: XXX,
            other_details: XXX,
            deposit_txn(deposit transactions): [
                {
                    date: dd/mm/yyyy,
                    amount: XXX
                }
            ],
            withdrawal_txn(withdrawal transactions): [
                {
                    date: dd/mm/yyyy,
                    amount: XXX
                }
            ],
            balance: (dyanmically calculated)
        }
    ]
    weekTotals: [
        {
            date: dd/mm/yyyy,
            total_deposit: XXX,
            total_withdrawal: XXX
        }
    ]

*/


exports.getTransactionsForRegGroup = async (req, res) => {
    try {
        const { regGroup, weekIndex } = req.query;

        // Validate required query parameters
        if (!regGroup || weekIndex === undefined) {
            return res.status(400).json({
                message: "Missing required query parameters: regGroup and weekIndex are required"
            });
        }

        // Parse weekIndex to integer
        const week = parseInt(weekIndex);
        if (isNaN(week) || week < 0) {
            return res.status(400).json({
                message: "weekIndex must be a non-negative integer"
            });
        }

        // Calculate start and end dates for the requested week
        const { year = new Date().getFullYear() } = req.query; // Get year from query or use current year
        const firstDayOfYear = new Date(year, 0, 1); // January 1st of requested year
        
        // Adjust firstDayOfYear to start on Monday if it's not already
        const dayOfWeek = firstDayOfYear.getDay();
        const daysToAdd = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 7 - dayOfWeek);
        firstDayOfYear.setDate(firstDayOfYear.getDate() + daysToAdd);
        
        const start = new Date(firstDayOfYear);
        start.setDate(firstDayOfYear.getDate() + (week * 7)); // Start from first Monday
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Go to Sunday
        end.setHours(23, 59, 59, 999);

        console.log("start and enddate: ", start, end);

        // Find all customers in registration group
        const customers = await Customer.find({
            group: regGroup.toUpperCase(),

        }).sort({ group_index: 1})

        if(customers.length === 0 || !customers){
            return res.status(404).json({ message: 'No users found in this group'})
        }

        const totalTransactions = await Transaction.find({
            owner: { $in: customers.map(c => c._id) }
        });

        // Get all transactions for these customers in date range
        const transactions = await Transaction.find({
            owner: { $in: customers.map(c => c._id) },
            date: { 
                $gte: start,
                $lte: end
            }
        });

        // console.log("transactions: ", transactions);

        // Initialize response data structure
        const customersData = customers.map(customer => {
            return {
                _id: customer._id,
                group: customer.group,
                group_index: customer.group_index,
                name: customer.name,
                address: customer.address,
                regDate: customer?.regDate?.toISOString()?.split("T")[0] || (new Date()).toISOString()?.split("T")[0],
                phone: customer.phone,
                deposit_txn: [],
                withdrawal_txn: [],
                balance: totalTransactions
                    .filter(t => t.owner.equals(customer._id))
                    .reduce((acc, t) => t.type === 'deposit' ? acc + t.amount : acc - t.amount, 0)
            };
        });

       

        const weekTotals = [];
        let currentDate = new Date(start);
        let currentMonth = ''
        
        // Process each day in the week
        while (currentDate <= end) {
            const dateStr = currentDate.toLocaleDateString('en-GB');

            let dailyDeposits = 0;
            let dailyWithdrawals = 0;

            // Process transactions for each customer
            customersData.forEach(customer => {
                const weekTransactions = transactions.filter(t => 
                    t.owner.equals(customer._id) && 
                    t.date.toDateString() == currentDate.toDateString()
                );

                const deposit = weekTransactions.find(t => t.type === 'deposit');
                const withdrawal = weekTransactions.find(t => t.type === 'withdrawal' && t.amount > 0);

                customer.deposit_txn.push({
                    date: dateStr,
                    amount: deposit ? deposit.amount : 0,
                    _id: deposit ? deposit._id : null
                });

                customer.withdrawal_txn.push({
                    date: dateStr,
                    amount: withdrawal ? withdrawal.amount : 0,
                    _id: withdrawal ? withdrawal._id : null
                });

                customer.withdrawal_txn.sort((a, b) => b.amount - a.amount);
                customer.withdrawal_txn = customer.withdrawal_txn.slice(0, 2);

                dailyDeposits += deposit ? Number(deposit.amount) : 0;
                dailyWithdrawals += withdrawal ? Number(withdrawal.amount) : 0;
            });

            weekTotals.push({
                date: dateStr,
                total_deposit: dailyDeposits,
                total_withdrawal: dailyWithdrawals
            });

            currentDate.setDate(currentDate.getDate() + 1);
            currentMonth = new Date(currentDate).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC'});
        }

        res.status(200).json({
            customers: customersData,
            weekTotals,
            currentMonth,
        });

    } catch(error) {
        console.error('Error in getTransactionsForRegGroup:', error);
        res.status(500).json({
            message: 'Failed to fetch transactions for registration group',
            error: error.message
        });
    }
}

exports.getTransactionsForAllGroups = async (req, res) => {
    try {
        const { weekIndex } = req.query;

        // Validate required query parameters
        if (weekIndex === undefined) {
            return res.status(400).json({
                message: "Missing required query parameters: weekIndex is required"
            });
        }

        // Parse weekIndex to integer
        const week = parseInt(weekIndex);
        if (isNaN(week) || week < 0) {
            return res.status(400).json({
                message: "weekIndex must be a non-negative integer"
            });
        }

        // Calculate start and end dates for the requested week
        const { year = new Date().getFullYear() } = req.query; // Get year from query or use current year
        const firstDayOfYear = new Date(year, 0, 1); // January 1st of requested year
        
        // Adjust firstDayOfYear to start on Monday if it's not already
        const dayOfWeek = firstDayOfYear.getDay();
        const daysToAdd = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 7 - dayOfWeek);
        firstDayOfYear.setDate(firstDayOfYear.getDate() + daysToAdd);
        
        const start = new Date(firstDayOfYear);
        start.setDate(firstDayOfYear.getDate() + (week * 7)); // Start from first Monday
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Go to Sunday
        end.setHours(23, 59, 59, 999);

        console.log("start and enddate: ", start, end);

        // Find all customers in registration group
        const customers = await Customer.find({ group: 'A'}).sort({ group: 1, group_index: 1 });

        const totalTransactions = await Transaction.find({
            owner: { $in: customers.map(c => c._id) }
        });

        // Get all transactions for these customers in date range
        const transactions = await Transaction.find({
            owner: { $in: customers.map(c => c._id) },
            date: { 
                $gte: start,
                $lte: end
            }
        });

        // console.log("transactions: ", transactions);

        // Initialize response data structure
        const customersData = customers.map(customer => {
            return {
                _id: customer._id,
                group: customer.group,
                group_index: customer.group_index,
                name: customer.name,
                address: customer.address,
                regDate: customer.regDate.toISOString().split("T")[0],
                phone: customer.phone,
                deposit_txn: [],
                withdrawal_txn: [],
                balance: totalTransactions
                    .filter(t => t.owner.equals(customer._id))
                    .reduce((acc, t) => t.type === 'deposit' ? acc + t.amount : acc - t.amount, 0)
            };
        });

       

        const weekTotals = [];
        let currentDate = new Date(start);
        let currentMonth = ''
        
        // Process each day in the week
        while (currentDate <= end) {
            const dateStr = currentDate.toLocaleDateString('en-GB');

            let dailyDeposits = 0;
            let dailyWithdrawals = 0;

            // Process transactions for each customer
            customersData.forEach(customer => {
                const weekTransactions = transactions.filter(t => 
                    t.owner.equals(customer._id) && 
                    t.date.toDateString() == currentDate.toDateString()
                );

                const deposit = weekTransactions.find(t => t.type === 'deposit');
                const withdrawal = weekTransactions.find(t => t.type === 'withdrawal' && t.amount > 0);

                customer.deposit_txn.push({
                    date: dateStr,
                    amount: deposit ? deposit.amount : 0,
                    _id: deposit ? deposit._id : null
                });

                customer.withdrawal_txn.push({
                    date: dateStr,
                    amount: withdrawal ? withdrawal.amount : 0,
                    _id: withdrawal ? withdrawal._id : null
                });

                customer.withdrawal_txn.sort((a, b) => b.amount - a.amount);
                customer.withdrawal_txn = customer.withdrawal_txn.slice(0, 2);

                dailyDeposits += deposit ? Number(deposit.amount) : 0;
                dailyWithdrawals += withdrawal ? Number(withdrawal.amount) : 0;
            });

            weekTotals.push({
                date: dateStr,
                total_deposit: dailyDeposits,
                total_withdrawal: dailyWithdrawals
            });

            currentDate.setDate(currentDate.getDate() + 1);
            currentMonth = new Date(currentDate).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC'});
        }

        res.status(200).json({
            customers: customersData,
            weekTotals,
            currentMonth,
        });

    } catch(error) {
        console.error('Error in getTransactionsForRegGroup:', error);
        res.status(500).json({
            message: 'Failed to fetch transactions for registration group',
            error: error.message
        });
    }
}

// Update a transaction
exports.updateTransaction = async (req, res) => {
    try {
        const { txn_id } = req.params;
        const { amount, date } = req.body;

        const transaction = await Transaction.findById(txn_id);
        if(!transaction){
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // if amount is less than 0, return error
        if(amount < 0){
            return res.status(400).json({ message: 'Amount cannot be less than 0' });
        }

        const transactions = await Transaction.find({ owner: transaction.owner });

        // refuse update is transaction is withdrawal and amount is greater than calculated available balance
        if(transaction.type === 'withdrawal'){
            const calculatedAvailableBalance = await calculateBalance(transactions);
            if(amount > (calculatedAvailableBalance + transaction.amount)){
                return res.status(400).json({ message: 'Amount cannot be greater than available balance' });
            }
        }

      
        // if amount provided is exactly 0 then delete the transaction
        if(amount === 0 || amount === Number(0)){
            await Transaction.findByIdAndDelete(txn_id);
            return res.status(200).json({ message: 'Transaction deleted successfully' });
        }

        // if amount is provided, update the amount else keep the existing amount
        amount ? transaction.amount = Number(amount) : transaction.amount;

        // if date is provided, update the date else keep the existing date
        date ? transaction.date = date : transaction.date;

        await transaction.save();

        res.status(200).json(transaction);

    } catch (error) {
        console.error('Error in updateTransaction:', error);
        res.status(400).json({ 
            message: 'Failed to update transaction',
            error: error.message 
        });
    }
};


exports.getDashboardData = async (req, res) => {
    try {
        const customers = await Customer.find();
        let uniqueGroups = [...new Set(customers.map(customer => customer.group ))]; 


        // Count total customers
        const no_of_customers = await Customer.countDocuments();

        // Fetch transactions
        const depositTransactions = await Transaction.find({ type: 'deposit' });
        const withdrawalTransactions = await Transaction.find({ type: 'withdrawal' });

        // Calculate total income from deposits
        const income = depositTransactions.reduce((acc, t) => acc + t.amount, 0);

        // Calculate total withdrawals
        const withdrawals = withdrawalTransactions.reduce((acc, t) => acc + t.amount, 0);

        const groups = 

        res.status(200).json({ no_of_customers, income, withdrawals, no_of_groups: uniqueGroups.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error getting dashboard data' });
    }
};


// Delete a customer
exports.deleteTransaction = async (req, res) => {
    try {

    const id = req.params.id;

    if(!id){
        return res.status(404).json({ message: 'Transaction id is required' });
    }

    await Transaction.findByIdAndDelete(id);
    // If customer doesn't exist
    if (!Transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
    }
  
      res.status(200).json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error deleting customer data' });
    }
  };




  /* 
  download reports as excel sheets...
  */
  const ExcelJS = require('exceljs');
//   const Customer = require('../models/customer'); // Adjust path as needed
//   const Transaction = require('../models/transaction'); // Adjust path as needed
//   const mongoose = require('mongoose');
  
  // Controller to generate both Excel sheets
  exports.generateExcelReports = async (req, res) => {
      try {
          // Create a new workbook
          const workbook = new ExcelJS.Workbook();
          
          // 1. First Sheet - Customer Details
          const customerSheet = workbook.addWorksheet('Customers');
          
          // Define columns for customer sheet
          customerSheet.columns = [
              { header: 'Name', key: 'name', width: 20 },
              { header: 'Group', key: 'group', width: 15 },
              { header: 'Group Index', key: 'group_index', width: 15 },
              { header: 'Address', key: 'address', width: 30 },
              { header: 'Phone', key: 'phone', width: 15 },
              { header: 'Registration Date', key: 'regDate', width: 20 },
              { header: 'Balance', key: 'balance', width: 15 }
          ];
  
          // Fetch all customers
          const customers = await Customer.find().sort({ group: 1, group_index: 1 });
          
          // Add customer data to sheet
          customers.forEach(customer => {
              customerSheet.addRow({
                  name: customer.name,
                  group: customer.group,
                  group_index: customer.group_index,
                  address: customer.address,
                  phone: customer.phone,
                  regDate: new Date(customer.regDate).toLocaleDateString(),
                  balance: customer.balance
              });
          });
  
          // Style the customer sheet headers
          customerSheet.getRow(1).font = { bold: true };
          customerSheet.getRow(1).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFCCCCCC' }
          };
  
          // 2. Second Sheet - Transactions by Month
          const transactions = await Transaction.find()
              .populate('owner')
              .sort({ date: 1 });
  
          // Group transactions by month
          const transactionsByMonth = {};
          transactions.forEach(transaction => {
              const monthYear = transaction.date.toLocaleString('default', { 
                  month: 'long', 
                  year: 'numeric' 
              });
              
              if (!transactionsByMonth[monthYear]) {
                  transactionsByMonth[monthYear] = [];
              }
              transactionsByMonth[monthYear].push(transaction);
          });
  
          // Create a sheet for each month
          for (const [monthYear, monthTransactions] of Object.entries(transactionsByMonth)) {
              const transactionSheet = workbook.addWorksheet(monthYear);
              
              // Get all unique dates in this month
              const uniqueDates = [...new Set(monthTransactions.map(t => 
                  new Date(t.date).toLocaleDateString()
              ))].sort((a, b) => new Date(a) - new Date(b));
  
              // Create columns: username + dates
              const columns = [
                  { header: 'Username', key: 'username', width: 20 },
                  ...uniqueDates.map(date => ({
                      header: date,
                      key: date,
                      width: 15
                  }))
              ];
  
              transactionSheet.columns = columns;
  
              // Group transactions by customer
              const transactionsByCustomer = {};
              monthTransactions.forEach(t => {
                  const customerId = t.owner._id.toString();
                  if (!transactionsByCustomer[customerId]) {
                      transactionsByCustomer[customerId] = {
                          username: t.owner.name,
                          transactions: {}
                      };
                  }
                  const dateKey = new Date(t.date).toLocaleDateString();
                  if (!transactionsByCustomer[customerId].transactions[dateKey]) {
                      transactionsByCustomer[customerId].transactions[dateKey] = 0;
                  }
                  // Add or subtract based on transaction type
                  const amount = t.type === 'deposit' ? t.amount : -t.amount;
                  transactionsByCustomer[customerId].transactions[dateKey] += amount;
              });
  
              // Add rows to sheet
              Object.values(transactionsByCustomer).forEach(customerData => {
                  const rowData = { username: customerData.username };
                  uniqueDates.forEach(date => {
                      rowData[date] = customerData.transactions[date] || 0;
                  });
                  transactionSheet.addRow(rowData);
              });
  
              // Style the transaction sheet headers
              transactionSheet.getRow(1).font = { bold: true };
              transactionSheet.getRow(1).fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFCCCCCC' }
              };
  
              // Add conditional formatting for negative values
              uniqueDates.forEach((date, index) => {
                  const columnLetter = String.fromCharCode(66 + index); // Start from B
                  transactionSheet.getColumn(index + 2).eachCell((cell, rowNumber) => {
                      if (rowNumber > 1 && cell.value < 0) {
                          cell.font = { color: { argb: 'FFFF0000' } }; // Red for negative
                      }
                  });
              });
          }
  
          // Write to buffer
          const buffer = await workbook.xlsx.writeBuffer();
  
          // Set response headers
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename="Customer_Transactions.xlsx"');
  
          // Send the buffer
          res.send(buffer);
  
      } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Error generating Excel reports', error: error.message });
      }
  };