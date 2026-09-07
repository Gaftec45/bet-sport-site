const mongoose = require("mongoose");

const User = require("../models/User");
const Withdrawal = require("../models/Withdrawal");
const Transaction = require("../models/Transaction");

const {
    initiateTransfer
} = require("./paystackTransferService");

function generateReference(prefix = "TXN") {
    return `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()}`;
}


// ===============================
// APPROVE WITHDRAWAL
// ===============================

async function approveWithdrawal(withdrawalId) {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const withdrawal =
            await Withdrawal.findOneAndUpdate(
                {
                    _id: withdrawalId,
                    status: "pending"
                },
                {
                    $set: {
                        status: "approved",
                        processedAt: new Date()
                    }
                },
                {
                    returnDocument: "after",
                    session
                }
            );

        if (!withdrawal) {

            await session.abortTransaction();

            return {
                success: false,
                alreadyProcessed: true
            };
        }

        await session.commitTransaction();

        return {
            success: true,
            withdrawal
        };

    } catch (error) {

        await session.abortTransaction();

        throw error;

    } finally {

        session.endSession();

    }
}


// ===============================
// REJECT + REFUND WITHDRAWAL
// ===============================

async function rejectWithdrawal(
    withdrawalId,
    adminNote = "Withdrawal rejected by admin."
) {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        // Only a PENDING withdrawal can be rejected.
        const withdrawal =
            await Withdrawal.findOneAndUpdate(
                {
                    _id: withdrawalId,
                    status: "pending"
                },
                {
                    $set: {
                        status: "rejected",
                        adminNote,
                        processedAt: new Date()
                    }
                },
                {
                    returnDocument: "after",
                    session
                }
            );

        if (!withdrawal) {

            await session.abortTransaction();

            return {
                success: false,
                alreadyProcessed: true
            };
        }


        // Find user
        const user =
            await User.findById(withdrawal.user)
                .session(session);

        if (!user) {
            throw new Error("User not found.");
        }


        // Refund the withdrawn amount
        const balanceBefore = user.balance;

        user.balance += withdrawal.amount;

        await user.save({ session });


        // Create refund transaction
        await Transaction.create(
            [
                {
                    user: user._id,

                    type: "admin_credit",

                    amount: withdrawal.amount,

                    balanceBefore,

                    balanceAfter: user.balance,

                    status: "completed",

                    description:
                        `Refund for rejected withdrawal ${withdrawal.reference}. ${adminNote}`,

                    reference:
                        generateReference("REFUND")
                }
            ],
            { session }
        );


        await session.commitTransaction();

        return {
            success: true,
            withdrawal,
            balance: user.balance
        };

    } catch (error) {

        await session.abortTransaction();

        throw error;

    } finally {

        session.endSession();

    }

}

// ===============================
// INITIATE WITHDRAWAL PAYMENT
// ===============================

async function processWithdrawalPayment(withdrawalId) {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        // Only APPROVED withdrawals can be paid
        const withdrawal =
            await Withdrawal.findOneAndUpdate(
                {
                    _id: withdrawalId,
                    status: "approved"
                },
                {
                    $set: {
                        status: "processing"
                    }
                },
                {
                    returnDocument: "after",
                    session
                }
            );

        if (!withdrawal) {

            await session.abortTransaction();

            return {
                success: false,
                alreadyProcessed: true
            };
        }


        // Make sure a Paystack recipient exists
        if (!withdrawal.recipientCode) {

            await session.abortTransaction();

            throw new Error(
                "This withdrawal has no Paystack recipient code."
            );
        }


        // Create a unique Paystack transfer reference
        const transferReference =
            `TRF_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 10)
                .toUpperCase()}`;

        withdrawal.transferReference =
            transferReference;

        await withdrawal.save({ session }); 

        // Commit the status change first
        await session.commitTransaction();


        // Start the actual Paystack transfer
        const transfer =
            await initiateTransfer({

                amount:
                    withdrawal.amount,

                recipientCode:
                    withdrawal.recipientCode,

                reference:
                    transferReference,

                reason:
                    `Bet Lord withdrawal ${withdrawal.reference}`

            });


        return {
            success: true,
            withdrawal,
            transfer,
            transferReference
        };


    } catch (error) {

        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        throw error;

    } finally {

        session.endSession();

    }

}


async function refundFailedWithdrawal(
    withdrawalId,
    adminNote
) {

    const session =
        await mongoose.startSession();

    try {

        session.startTransaction();

        // Only PROCESSING withdrawals can be refunded.
        // This prevents duplicate webhook refunds.
        const withdrawal =
            await Withdrawal.findOneAndUpdate(
                {
                    _id: withdrawalId,
                    status: "processing"
                },
                {
                    $set: {
                        status: "rejected",
                        adminNote,
                        processedAt: new Date()
                    }
                },
                {
                    returnDocument: "after",
                    session
                }
            );

        if (!withdrawal) {

            await session.abortTransaction();

            return {
                success: false,
                alreadyProcessed: true
            };
        }


        const user =
            await User.findById(
                withdrawal.user
            ).session(session);

        if (!user) {
            throw new Error(
                "User not found."
            );
        }


        const balanceBefore =
            user.balance;

        user.balance +=
            withdrawal.amount;

        await user.save({
            session
        });


        // Create a separate refund transaction.
        await Transaction.create(
            [
                {
                    user: user._id,

                    type: "admin_credit",

                    amount:
                        withdrawal.amount,

                    balanceBefore,

                    balanceAfter:
                        user.balance,

                    status: "completed",

                    description:
                        `Refund for failed Paystack withdrawal ${withdrawal.reference}`,

                    reference:
                        `REFUND_${withdrawal.reference}`
                }
            ],
            { session }
        );


        await session.commitTransaction();

        console.log(
            `Withdrawal refunded: ${withdrawal.reference}`
        );

        return {
            success: true,
            withdrawal,
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
    approveWithdrawal,
    rejectWithdrawal,
    processWithdrawalPayment,
    refundFailedWithdrawal
};