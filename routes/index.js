require("dotenv").config()
const express = require("express");
const axios = require("axios");
const User = require("../models/User");
const Deposit = require("../models/Deposit");
const crypto = require("crypto");
const Withdrawal = require("../models/Withdrawal");
const {
    completeDeposit
} = require("../services/depositService");
const {
    createWithdrawal
} = require("../services/withdrawalService");
const {
    refundFailedWithdrawal
} = require("../services/withdrawalAdminService");

const {
    getBanks,
    resolveAccount,
    createTransferRecipient
} = require("../services/paystackTransferService");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("home", {
    title: "Bet Lord",
  });
});


router.get(
    "/api/paystack/banks",
    async (req, res) => {

        try {

            const banks =
                await getBanks();

            return res.json({
                success: true,
                banks
            });

        } catch (error) {

            console.error(
                "Paystack banks error:",
                error.response?.data ||
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load banks."
            });
        }
    }
);


router.get(
    "/api/paystack/resolve-account",
    async (req, res) => {

        try {

            const accountNumber =
                req.query.accountNumber;

            const bankCode =
                req.query.bankCode;

            if (!accountNumber || !bankCode) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Account number and bank code are required."
                });
            }

            if (!/^\d{10}$/.test(accountNumber)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Account number must be 10 digits."
                });
            }

            const account =
                await resolveAccount(
                    accountNumber,
                    bankCode
                );

            return res.json({
                success: true,
                account: {
                    accountNumber:
                        account.account_number,

                    accountName:
                        account.account_name,

                    bankCode:
                        bankCode
                }
            });

        } catch (error) {

            console.error(
                "Account verification error:",
                error.response?.data ||
                error.message
            );

            return res.status(400).json({
                success: false,
                message:
                    error.response?.data?.message ||
                    "Unable to verify bank account."
            });
        }
    }
);

router.post(
    "/api/paystack/webhook",
    async (req, res) => {

        try {

            /*
                Get Paystack signature
            */

            const signature =
                req.headers["x-paystack-signature"];


            if (!signature) {

                return res
                    .status(400)
                    .send("Missing signature.");

            }


            /*
                Generate our own signature
            */

            const hash =
                crypto
                    .createHmac(
                        "sha512",
                        process.env.PAYSTACK_SECRET_KEY
                    )
                    .update(req.body)
                    .digest("hex");


            /*
                Compare signatures
            */

            if (hash !== signature) {

                console.error(
                    "Invalid Paystack webhook signature."
                );

                return res
                    .status(401)
                    .send("Invalid signature.");

            }


            /*
                Convert raw body to JSON
            */

            const event =
                JSON.parse(req.body.toString());


            /*
                We only care about successful payments
            */

if (
    event.event === "transfer.success" ||
    event.event === "transfer.failed" ||
    event.event === "transfer.reversed"
) {

    const transfer =
        event.data;

    const transferReference =
        transfer.reference;

    if (!transferReference) {
        return res.sendStatus(200);
    }

    const withdrawal =
        await Withdrawal.findOne({
            transferReference
        });

    if (!withdrawal) {

        console.error(
            "Withdrawal not found for transfer:",
            transferReference
        );

        return res.sendStatus(200);
    }


    // ===============================
    // TRANSFER SUCCESS
    // ===============================

    if (event.event === "transfer.success") {

        if (
            withdrawal.status === "completed"
        ) {
            return res.sendStatus(200);
        }

        withdrawal.status =
            "completed";

        withdrawal.processedAt =
            new Date();

        await withdrawal.save();

        console.log(
            `Withdrawal completed: ${withdrawal.reference}`
        );

        return res.sendStatus(200);
    }


    // ===============================
    // TRANSFER FAILED / REVERSED
    // ===============================

    if (
        event.event === "transfer.failed" ||
        event.event === "transfer.reversed"
    ) {

        if (
            withdrawal.status === "completed" ||
            withdrawal.status === "rejected"
        ) {
            return res.sendStatus(200);
        }

const result =
    await refundFailedWithdrawal(
        withdrawal._id,
        event.event === "transfer.reversed"
            ? "Paystack reversed the transfer."
            : "Paystack transfer failed."
    );

if (
    result.success ||
    result.alreadyProcessed
) {

    return res.sendStatus(200);

}


        // withdrawal.processedAt =
        //     new Date();

        // await withdrawal.save();

        // console.log(
        //     `Withdrawal failed and refunded: ${withdrawal.reference}`
        // );

        return res.sendStatus(200);
    }

}


            const payment =
                event.data;


            const reference =
                payment.reference;


            if (!reference) {

                return res.sendStatus(200);

            }


            /*
                Find our deposit
            */

            const deposit =
                await Deposit.findOne({
                    reference
                });


            if (!deposit) {

                console.error(
                    "Deposit not found:",
                    reference
                );

                return res.sendStatus(200);

            }


            /*
                Prevent duplicate processing
            */

            if (deposit.status === "completed") {

                return res.sendStatus(200);

            }


            /*
                Verify amount
            */

            const paidAmount =
                Number(payment.amount) / 100;


            if (paidAmount !== deposit.amount) {

                console.error(
                    "Payment amount mismatch.",
                    {
                        reference,
                        expected: deposit.amount,
                        received: paidAmount
                    }
                );


                deposit.status = "failed";

                await deposit.save();

                return res.sendStatus(200);

            }


            /*
                Verify currency
            */

            if (payment.currency !== "NGN") {

                console.error(
                    "Invalid payment currency:",
                    payment.currency
                );

                deposit.status = "failed";

                await deposit.save();

                return res.sendStatus(200);

            }


            /*
                Credit user's wallet
            */

            const result =
                await completeDeposit(reference);

            if (
                result.success ||
                result.alreadyProcessed
            ) {
                return res.sendStatus(200);
            }



            /*
                Tell Paystack we received the webhook
            */

            return res.sendStatus(200);


        } catch (error) {

            console.error(
                "Paystack webhook error:",
                error
            );

            return res
                .status(500)
                .send("Webhook error.");

        }

    }
);


router.get("/deposit", async (req, res) => {

    try {

        if (!req.session.userId) {
            return res.redirect("/login");
        }

        const deposits = await Deposit.find({
            user: req.session.userId
        })
        .sort({ createdAt: -1 })
        .limit(20);

        res.render("deposit", {
            title: "Deposit",
            deposits
        });

    } catch (error) {

        console.error("Deposit page error:", error);

        res.status(500).send(
            "Unable to load deposit page."
        );

    }

});


router.post("/deposit", async (req, res) => {

    try {

        if (!req.session.userId) {
            return res.redirect("/login");
        }

        const amount = Number(req.body.amount);

        if (
            !Number.isFinite(amount) ||
            amount < 100
        ) {
            return res.status(400).send(
                "Minimum deposit is ₦100."
            );
        }

        const user = await User.findById(
            req.session.userId
        );

        if (!user) {
            return res.status(401).send(
                "User account not found."
            );
        }

        const reference =
            `DEP_${Date.now()}_${crypto
                .randomBytes(5)
                .toString("hex")
                .toUpperCase()}`;

        const deposit = await Deposit.create({

            user: user._id,

            amount,

            reference,

            status: "pending",

            paymentMethod: "paystack"

        });


        /*
            Initialize Paystack transaction
        */

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email: user.email,

                amount: Math.round(amount * 100),

                reference,

                currency: "NGN",

                callback_url:
                    `${process.env.APP_URL}/deposit/callback`,

                metadata: {
                    userId: user._id.toString(),

                    depositId:
                        deposit._id.toString()
                }
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

                    "Content-Type":
                        "application/json"
                }
            }
        );


        if (
            !response.data ||
            !response.data.status
        ) {

            deposit.status = "failed";

            await deposit.save();

            return res.status(500).send(
                "Unable to initialize payment."
            );

        }


        /*
            Send user to Paystack checkout
        */

        res.redirect(
            response.data.data.authorization_url
        );


    } catch (error) {

        console.error(
            "Paystack initialization error:",

            error.response?.data ||
            error.message
        );

        res.status(500).send(
            "Unable to start payment."
        );

    }

});

router.get("/deposit/callback", async (req, res) => {

    try {

        if (!req.session.userId) {
            return res.redirect("/login");
        }

        const reference = req.query.reference;

        if (!reference) {
            return res.redirect("/deposit");
        }


        /*
            Verify transaction with Paystack
        */

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );


        const payment = response.data.data;


        /*
            Find our deposit
        */

        const deposit = await Deposit.findOne({
            reference
        });


        if (!deposit) {

            return res.status(404).send(
                "Deposit not found."
            );

        }


        /*
            Already completed
        */

        if (deposit.status === "completed") {

            return res.redirect(
                "/deposit?status=success"
            );

        }


        /*
            Check payment status
        */

        if (payment.status !== "success") {

            return res.redirect(
                "/deposit?status=failed"
            );

        }


        /*
            Check currency
        */

        if (payment.currency !== "NGN") {

            deposit.status = "failed";

            await deposit.save();

            return res.redirect(
                "/deposit?status=failed"
            );

        }


        /*
            Paystack amount is in kobo
        */

        const paidAmount =
            Number(payment.amount) / 100;


        /*
            Make sure amount matches
        */

        if (paidAmount !== deposit.amount) {

            console.error(
                "Deposit amount mismatch:",
                {
                    reference,
                    expected: deposit.amount,
                    received: paidAmount
                }
            );

            deposit.status = "failed";

            await deposit.save();

            return res.redirect(
                "/deposit?status=failed"
            );

        }


        /*
            Make sure this deposit belongs
            to the currently logged-in user
        */

        if (
            deposit.user.toString() !==
            req.session.userId.toString()
        ) {

            return res.status(403).send(
                "Unauthorized payment."
            );

        }


        /*
            Credit wallet
        */

        const result =
    await completeDeposit(reference);

if (
    !result.success &&
    !result.alreadyProcessed
) {
    return res.redirect(
        "/deposit?status=failed"
    );
}


        console.log(
            `Deposit verified and completed: ${reference}`
        );


        /*
            Send user back to deposit page
        */

        return res.redirect(
            "/deposit?status=success"
        );


    } catch (error) {

        console.error(
            "Paystack verification error:",

            error.response?.data ||
            error.message
        );

        return res.redirect(
            "/deposit?status=failed"
        );

    }

});

router.get("/withdraw", async (req, res) => {

    try {

        if (!req.session.userId) {
            return res.redirect("/login");
        }

        const withdrawals = await Withdrawal.find({
            user: req.session.userId
        })
        .sort({ createdAt: -1 })
        .limit(20);

        res.render("withdraw", {
            title: "Withdraw",
            withdrawals
        });

    } catch (error) {

        console.error(
            "Withdrawal page error:",
            error
        );

        res.status(500).send(
            "Unable to load withdrawal page."
        );

    }

});


router.post("/withdraw", async (req, res) => {

    try {

        if (!req.session.userId) {
            return res.redirect("/login");
        }

        const amount = Number(req.body.amount);

        const bankName =
            req.body.bankName?.trim();

        const bankCode =
            req.body.bankCode?.trim();
        
            const accountNumber =
            req.body.accountNumber?.trim();

        const accountName =
            req.body.accountName?.trim();


        if (
            !Number.isFinite(amount) ||
            amount < 100
        ) {
            return res.status(400).send(
                "Minimum withdrawal is ₦100."
            );
        }


        if (
            !bankName || !bankCode ||
            !accountNumber ||
            !accountName
        ) {
            return res.status(400).send(
                "Please provide all bank details."
            );
        }


        if (!/^\d{10}$/.test(accountNumber)) {
            return res.status(400).send(
                "Account number must be 10 digits."
            );
        }


const result =
    await createWithdrawal({

        userId:
            req.session.userId,

        amount,

        bankName,

        bankCode,

        accountNumber,

        accountName

    });


        console.log(
            `Withdrawal created: ${result.withdrawal.reference}`
        );


        return res.redirect("/withdraw");

    } catch (error) {

        console.error(
            "Withdrawal request error:",
            error
        );

        return res.status(400).send(
            error.message ||
            "Unable to process withdrawal request."
        );

    }

});

// router.get("/dashboard", async (req, res) => {
//   if (!req.session.userId) {
//     return res.redirect("/login");
//   }

//   const user = await User.findById(req.session.userId);

//   if (!user) {
//     req.session.destroy();
//     return res.redirect("/login");
//   }

//   res.render("dashboard", {
//     title: "Dashboard",
//     user,
//   });
// });

module.exports = router;