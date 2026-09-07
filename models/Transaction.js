const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    type: {
        type: String,
        enum: [
            "deposit",
            "withdrawal",
            "bet_stake",
            "bet_win",
            "admin_credit",
            "admin_debit"
        ],
        required: true
    },

    amount: {
        type: Number,
        required: true,
        min: 0
    },

    balanceBefore: {
        type: Number,
        required: true
    },

    balanceAfter: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: [
            "pending",
            "completed",
            "failed",
            "cancelled"
        ],
        default: "completed"
    },

    description: {
        type: String,
        default: ""
    },

    reference: {
        type: String,
        unique: true,
        sparse: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model(
    "Transaction",
    transactionSchema
);