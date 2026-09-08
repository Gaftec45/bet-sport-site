const User = require("../models/User");
const Transaction = require("../models/Transaction");
const crypto = require("crypto");


/*
=========================================================
GENERATE TRANSACTION REFERENCE
=========================================================
*/

function generateReference(prefix = "TXN") {

    return `${prefix}_${Date.now()}_${crypto
        .randomBytes(5)
        .toString("hex")
        .toUpperCase()}`;

}


/*
=========================================================
CREDIT USER
=========================================================

Used for:

- Bet winnings
- Deposits
- Admin credits
- Refunds

The balance update is performed atomically so two
simultaneous requests cannot overwrite each other.
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


    /*
    -----------------------------------------------------
    ATOMIC BALANCE UPDATE
    -----------------------------------------------------
    */

    const user = await User.findOneAndUpdate(

        {
            _id: userId
        },

        {
            $inc: {
                balance: amount
            }
        },

        {
            new: true
        }

    );


    if (!user) {
        throw new Error("User not found.");
    }


    /*
    -----------------------------------------------------
    CALCULATE BALANCE BEFORE
    -----------------------------------------------------

    Since the update has already happened:

        balanceBefore =
        balanceAfter - amount
    */

    const balanceAfter = user.balance;

    const balanceBefore =
        balanceAfter - amount;


    /*
    -----------------------------------------------------
    CREATE TRANSACTION
    -----------------------------------------------------
    */

    let transaction;

    try {

        transaction = await Transaction.create({

            user: user._id,

            type,

            amount,

            balanceBefore,

            balanceAfter,

            status: "completed",

            description,

            reference: generateReference("CREDIT")

        });

    } catch (error) {

        /*
        IMPORTANT:

        If transaction creation fails, reverse the
        balance change so we don't have money movement
        without a transaction record.
        */

        await User.updateOne(

            {
                _id: user._id
            },

            {
                $inc: {
                    balance: -amount
                }
            }

        );

        throw error;

    }


    return {
        user,
        transaction
    };

}


/*
=========================================================
DEBIT USER
=========================================================

Used for:

- Bet stake
- Withdrawal
- Admin debit

The balance check and deduction happen in ONE atomic
MongoDB operation.
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


    /*
    -----------------------------------------------------
    ATOMIC BALANCE CHECK + DEDUCTION
    -----------------------------------------------------

    This is very important.

    Instead of:

        read balance
        check balance
        subtract
        save

    MongoDB performs:

        balance >= amount
        AND
        balance -= amount

    as one operation.
    */

    const user = await User.findOneAndUpdate(

        {
            _id: userId,

            balance: {
                $gte: amount
            }

        },

        {
            $inc: {
                balance: -amount
            }
        },

        {
            new: true
        }

    );


    /*
    -----------------------------------------------------
    DETERMINE WHY THE UPDATE FAILED
    -----------------------------------------------------
    */

    if (!user) {

        const existingUser =
            await User.findById(userId);

        if (!existingUser) {
            throw new Error("User not found.");
        }

        throw new Error("Insufficient balance.");

    }


    /*
    -----------------------------------------------------
    CALCULATE BALANCE BEFORE
    -----------------------------------------------------
    */

    const balanceAfter = user.balance;

    const balanceBefore =
        balanceAfter + amount;


    /*
    -----------------------------------------------------
    CREATE TRANSACTION
    -----------------------------------------------------
    */

    let transaction;

    try {

        transaction = await Transaction.create({

            user: user._id,

            type,

            amount,

            balanceBefore,

            balanceAfter,

            status: "completed",

            description,

            reference: generateReference("DEBIT")

        });

    } catch (error) {

        /*
        IMPORTANT:

        If transaction creation fails, restore the
        deducted balance.
        */

        await User.updateOne(

            {
                _id: user._id
            },

            {
                $inc: {
                    balance: amount
                }
            }

        );

        throw error;

    }


    return {
        user,
        transaction
    };

}


/*
=========================================================
EXPORT
=========================================================
*/

module.exports = {
    creditUser,
    debitUser
};