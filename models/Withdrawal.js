const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    amount: {
        type: Number,
        required: true,
        min: 100
    },

    bankName: {
        type: String,
        required: true
    },

    accountNumber: {
        type: String,
        required: true
    },

    accountName: {
        type: String,
        required: true
    },

    recipientCode: {
    type: String,
    default: null
    },

    transferReference: {
    type: String,
    default: null
    },

    bankCode: {
        type: String,
        default: null
    },

    status: {
        type: String,
        enum: [
            "pending",
            "processing",
            "approved",
            "rejected",
            "completed",
            "cancelled"
        ],
        default: "pending"
    },

    reference: {
        type: String,
        unique: true,
        required: true
    },

    adminNote: {
        type: String,
        default: ""
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    processedAt: {
        type: Date,
        default: null
    }

});


module.exports = mongoose.model(
    "Withdrawal",
    withdrawalSchema
);