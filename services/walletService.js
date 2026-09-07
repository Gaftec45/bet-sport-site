const User = require("../models/User");
const Transaction = require("../models/Transaction");
const crypto = require("crypto");


function generateReference(prefix = "TXN") {

    return `${prefix}_${Date.now()}_${crypto
        .randomBytes(5)
        .toString("hex")
        .toUpperCase()}`;

}


/*
    CREDIT USER
*/

async function creditUser({
    userId,
    amount,
    type = "admin_credit",
    description = ""
}) {

    if (!amount || amount <= 0) {
        throw new Error("Invalid credit amount.");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    const balanceBefore = user.balance;

    user.balance += amount;

    await user.save();

    const transaction = await Transaction.create({

        user: user._id,

        type,

        amount,

        balanceBefore,

        balanceAfter: user.balance,

        status: "completed",

        description,

        reference: generateReference("CREDIT")

    });

    return {
        user,
        transaction
    };

}


/*
    DEBIT USER
*/

async function debitUser({
    userId,
    amount,
    type = "admin_debit",
    description = ""
}) {

    if (!amount || amount <= 0) {
        throw new Error("Invalid debit amount.");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    if (user.balance < amount) {
        throw new Error("Insufficient balance.");
    }

    const balanceBefore = user.balance;

    user.balance -= amount;

    await user.save();

    const transaction = await Transaction.create({

        user: user._id,

        type,

        amount,

        balanceBefore,

        balanceAfter: user.balance,

        status: "completed",

        description,

        reference: generateReference("DEBIT")

    });

    return {
        user,
        transaction
    };

}


module.exports = {
    creditUser,
    debitUser
};