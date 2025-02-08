const express = require('express');
const router = express.Router();
const { 
    createNewWeek, 
    makeDeposit, 
    getAllTransactions,
    makeWithdrawal,
    getWeekById,
 } = require('../controllers/week.controller');

// create a new week
router.post('/new', createNewWeek);

// get a week by id
router.get('/get_week/:id', getWeekById);

// make a deposit for a customer for a particular week
router.put('/deposit', makeDeposit);

// make a withdrawal for a customer for a particular week
// router.put('/withdrawal', makeWithdrawal);

// get all transactions for a week
router.get('/transactions', getAllTransactions);

module.exports = router;