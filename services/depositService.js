const mongoose = require("mongoose");

const Deposit = require("../models/Deposit");
const { creditUser } = require("./walletService");


async function completeDeposit(reference) {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();


        /*
            Find and lock the pending deposit.

            Only a pending deposit can be processed.
        */

        const deposit = await Deposit.findOneAndUpdate(

            {
                reference,
                status: "pending"
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


        /*
            Another request may already be processing
            or have completed this deposit.
        */

        if (!deposit) {

            await session.abortTransaction();

            return {
                success: false,
                alreadyProcessed: true
            };

        }


        /*
            Credit the wallet.
        */

        const user = await mongoose
            .model("User")
            .findById(deposit.user)
            .session(session);


        if (!user) {

            await session.abortTransaction();

            throw new Error(
                "User account not found."
            );

        }


        const balanceBefore = user.balance;

        user.balance += deposit.amount;

        await user.save({ session });


        /*
            Create wallet transaction.
        */

        const Transaction =
            mongoose.model("Transaction");


        await Transaction.create(
            [
                {
                    user: user._id,

                    type: "deposit",

                    amount: deposit.amount,

                    balanceBefore,

                    balanceAfter: user.balance,

                    status: "completed",

                    description:
                        `Paystack deposit ${deposit.reference}`,

                    reference:
                        deposit.reference
                }
            ],
            { session }
        );


        /*
            Mark deposit completed.
        */

        deposit.status = "completed";

        deposit.completedAt = new Date();

        await deposit.save({ session });


        await session.commitTransaction();


        console.log(
            `Deposit completed: ${deposit.reference}`
        );


        return {
            success: true,
            deposit
        };


    } catch (error) {

        await session.abortTransaction();

        throw error;

    } finally {

        session.endSession();

    }

}


module.exports = {
    completeDeposit
};