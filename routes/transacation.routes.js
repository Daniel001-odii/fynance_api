const express = require('express');
const router = express.Router();
const { 
    createTransaction, 
    getTransactionsForRegGroup,
    updateTransaction,
    getTransactionsForAllGroups, 
    getDashboardData,
    deleteTransaction,
    generateExcelReports
} = require('../api/controllers/transactions.controller');

router.post('/', createTransaction);

router.get('/group', getTransactionsForRegGroup);

router.get('/dashboard', getDashboardData);

router.get('/all_group', getTransactionsForAllGroups)

router.delete('/:id/delete', deleteTransaction);

// update transaction date and amount..
router.put('/:txn_id/update', updateTransaction);


router.get('/reports', generateExcelReports);

module.exports = router;