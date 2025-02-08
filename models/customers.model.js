const mongoose = require('mongoose');


const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  group: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  regDate: {
    type: Date,
    default: Date.now
  },
  balance: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
