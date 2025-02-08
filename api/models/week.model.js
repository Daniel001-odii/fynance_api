const mongoose = require('mongoose');

const weekSchema = new mongoose.Schema({
    deposit_1: {
        date: Date,
        txn: [
            {
                customer: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Customer'
                },
                amount: {
                    type: Number,
                    default: 0
                }
            }
        ],
        total_deposit: {
            type: Number,
            default: 0
        }
   },
   deposit_2: {
        date: Date,
        txn: [
            {
                customer: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Customer'
                },
                amount: {
                    type: Number,
                    default: 0
                }
            }
        ],
        total_deposit: {
            type: Number,
            default: 0
        }
    },
    deposit_3: {
        date: Date,
        txn: [
            {
                customer: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Customer'
                },
                amount: {
                    type: Number,
                    default: 0
                }
            }
        ],
    },
    deposit_4: {
        date: Date,
        txn: [
            {
                customer: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Customer'
                },
                amount: {
                    type: Number,
                    default: 0
                }
            }
        ],
        total_deposit: {
            type: Number,
            default: 0
        }
    }, 
    deposit_5: {
        date: Date,
        txn: [
            {
                customer: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Customer'
                },
                amount: {
                    type: Number,
                    default: 0
                }
            }
        ],
        total_deposit: {
            type: Number,
            default: 0
        }
    },
    withdrawal_1: [
        {
            customer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Customer'
            },
            amount: {
                type: Number,
                default: 0
            },
            date: Date
        }
    ],
    withdrawal_2: [
        {
            customer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Customer'
            },
            amount: {
                type: Number,
                default: 0
            },
            date: Date
        }
    ]
})

module.exports = mongoose.model('Week', weekSchema);
