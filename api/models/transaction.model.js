const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    amount: {
        type: Number,
        default: 0,
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal'],
        default: 'deposit',
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    }
}, { timestamps: true });

/* // Add a pre-save middleware to check withdrawal limit
transactionSchema.pre('save', async function(next) {
    if (this.type === 'withdrawal') {
        // Get start and end of current week
        const date = this.date;
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);

        // Count withdrawals for this customer in current week
        const withdrawalCount = await this.constructor.countDocuments({
            owner: this.owner,
            type: 'withdrawal',
            date: {
                $gte: startOfWeek,
                $lte: endOfWeek
            }
        });

        if (withdrawalCount >= 2) {
            throw new Error('Maximum of 2 withdrawals per week allowed');
        }
    }
    next();
}); */

module.exports = mongoose.model('Transaction', transactionSchema);