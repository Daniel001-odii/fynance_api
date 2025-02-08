const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customers.controllers');

// Create a new customer
router.post('/', customerController.createCustomer);

// Get all customers
// router.get('/', customerController.getAllCustomers);

// Get a single customer by ID
router.get('/:id', customerController.getCustomerById);

// Update a customer
router.put('/:id', customerController.updateCustomer);

// Delete a customer
router.delete('/:id', customerController.deleteCustomer);

router.get('/groups/all', customerController.getUniqueCustomerGroups);



module.exports = router;
