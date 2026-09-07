const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema({

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

    reference: {
        type: String,
        required: true,
        unique: true
    },

    status: {
        type: String,
        enum: [
            "pending",
            "processing",
            "completed",
            "failed",
            "cancelled"
        ],
        default: "pending"
    },

    paymentMethod: {
        type: String,
        default: "paystack"
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    completedAt: {
        type: Date,
        default: null
    }

});

module.exports = mongoose.model("Deposit", depositSchema);