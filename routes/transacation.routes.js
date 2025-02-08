const express = require('express');
const router = express.Router();
const { 
    createTransaction, 
    getTransactionsForRegGroup,
    updateTransaction,
    getTransactionsForAllGroups, 
    getDashboardData,
    deleteTransaction
} = require('../controllers/transactions.controller');

router.post('/', createTransaction);

router.get('/group', getTransactionsForRegGroup);

router.get('/dashboard', getDashboardData);

router.get('/all_group', getTransactionsForAllGroups)

router.delete('/:id/delete', deleteTransaction);

// update transaction date and amount..
router.put('/:txn_id/update', updateTransaction);

module.exports = router;