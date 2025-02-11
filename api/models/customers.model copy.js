const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  regNo: {
    type: String,
    required: true,
    unique: true, // Validates that it starts with A1
  },
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String,
  },
  regDate: {
    type: Date,
    default: Date.now
  },
  balance: {
    type: Number,
    default: 0
  },
  transactions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }
  ]

});

module.exports = mongoose.model('Customer', customerSchema);
