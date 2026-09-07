const mongoose = require("mongoose");

const User = require("../models/User");
const Withdrawal = require("../models/Withdrawal");
const Transaction = require("../models/Transaction");

const {
    createTransferRecipient
} = require("./paystackTransferService");

async function createWithdrawal({
    userId,
    amount,
    bankName,
    bankCode,
    accountNumber,
    accountName
}) {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const user = await User.findById(userId)
            .session(session);

        if (!user) {
            throw new Error("User not found.");
        }

if (user.balance < amount) {
    throw new Error("Insufficient balance.");
}

const recipient =
    await createTransferRecipient({

        name: accountName,

        accountNumber,

        bankCode

    });

if (!recipient || !recipient.recipient_code) {

    throw new Error(
        "Paystack did not return a recipient code."
    );

}
        

        const reference =
            `WD_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 10)
                .toUpperCase()}`;


        const balanceBefore = user.balance;

        user.balance -= amount;

        await user.save({ session });


        const withdrawal =
    await Withdrawal.create(
        [
            {
                user: user._id,

                amount,

                bankName,

                bankCode,

                accountNumber,

                accountName,

                recipientCode:
                    recipient.recipient_code,

                status: "pending",

                reference
            }
        ],
        { session }
    );


        await Transaction.create(
            [
                {
                    user: user._id,

                    type: "withdrawal",

                    amount,

                    balanceBefore,

                    balanceAfter: user.balance,

                    status: "pending",

                    description:
                        `Withdrawal request ${reference}`,

                    reference
                }
            ],
            { session }
        );


        await session.commitTransaction();

        return {
            success: true,
            withdrawal: withdrawal[0],
            balance: user.balance
        };

    } catch (error) {

        await session.abortTransaction();

        throw error;

    } finally {

        session.endSession();

    }

}

module.exports = {
    createWithdrawal
};