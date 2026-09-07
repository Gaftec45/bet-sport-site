const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Admin = require("../models/Admin");
const Bet = require("../models/Bet");
const Transaction = require("../models/Transaction");
const Withdrawal = require("../models/Withdrawal");

const {
    approveWithdrawal,
    rejectWithdrawal,
    processWithdrawalPayment
} = require("../services/withdrawalAdminService");

const { settleEvent } = require("../services/settlementService");


/*
    =========================
    ADMIN AUTH MIDDLEWARE
    =========================
*/

async function requireAdmin(req, res, next) {

    try {

        if (!req.session.adminId) {
            return res.redirect("/admin/login");
        }

        const admin = await Admin.findById(req.session.adminId);

        if (!admin) {

            req.session.adminId = null;
            req.session.isAdmin = false;

            return res.redirect("/admin/login");
        }

        req.admin = admin;

        next();

    } catch (error) {

        console.error("Admin authentication error:", error);

        res.redirect("/admin/login");

    }

}


/*
    =========================
    ADMIN LOGIN PAGE
    =========================
*/

router.get("/admin/login", (req, res) => {

    if (req.session.adminId) {
        return res.redirect("/admin");
    }

    res.render("admin-login", {
        title: "Admin Login"
    });

});


/*
    =========================
    ADMIN LOGIN
    =========================
*/

router.post("/admin/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).send(
                "Email and password are required."
            );

        }

        const admin = await Admin.findOne({
            email: email.toLowerCase().trim()
        });

        if (!admin) {

            return res.status(401).send(
                "Invalid admin credentials."
            );

        }

        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordMatch) {

            return res.status(401).send(
                "Invalid admin credentials."
            );

        }

        /*
            Store admin identity in session
        */

        req.session.adminId = admin._id;
        req.session.isAdmin = true;

        res.redirect("/admin");

    } catch (error) {

        console.error("Admin login error:", error);

        res.status(500).send(
            "Unable to login."
        );

    }

});


/*
    =========================
    ADMIN DASHBOARD
    =========================
*/

router.get("/admin", requireAdmin, async (req, res) => {

    try {

        const totalUsers = await User.countDocuments();

        const totalBets = await Bet.countDocuments();

        const pendingBets = await Bet.countDocuments({
            status: "pending"
        });

        const wonBets = await Bet.countDocuments({
            status: "won"
        });

        const lostBets = await Bet.countDocuments({
            status: "lost"
        });

        const recentBets = await Bet.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 })
            .limit(10);

        res.render("admin-dashboard", {

            title: "Admin Dashboard",

            totalUsers,
            totalBets,
            pendingBets,
            wonBets,
            lostBets,
            recentBets

        });

    } catch (error) {

        console.error(
            "Admin dashboard error:",
            error
        );

        res.status(500).send(
            "Unable to load admin dashboard."
        );

    }

});


/*
    =========================
    ADMIN LOGOUT
    =========================
*/

router.get("/admin/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.error(
                "Admin logout error:",
                error
            );

            return res.redirect("/admin");
        }

        res.redirect("/admin/login");

    });

});


/*
    =========================
    ALL BETS
    =========================
*/

router.get("/admin/bets", requireAdmin, async (req, res) => {

    try {

        const bets = await Bet.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        res.render("admin-bets", {
            title: "Manage Bets",
            bets
        });

    } catch (error) {

        console.error(
            "Admin bets error:",
            error
        );

        res.status(500).send(
            "Unable to load bets."
        );

    }

});


/*
    =========================
    USERS MANAGEMENT
    =========================
*/

router.get("/admin/users", requireAdmin, async (req, res) => {

    try {

        const search = req.query.search || "";

        let query = {};

        if (search.trim()) {

            query = {
                $or: [
                    {
                        name: {
                            $regex: search.trim(),
                            $options: "i"
                        }
                    },
                    {
                        email: {
                            $regex: search.trim(),
                            $options: "i"
                        }
                    }
                ]
            };

        }

        const users = await User.find(query)
            .select("name email balance createdAt")
            .sort({ createdAt: -1 });

        res.render("admin-users", {

            title: "Manage Users",

            users,

            search

        });

    } catch (error) {

        console.error(
            "Admin users error:",
            error
        );

        res.status(500).send(
            "Unable to load users."
        );

    }

});


router.get(
    "/admin/withdrawals",
    requireAdmin,
    async (req, res) => {

        try {

            const withdrawals =
                await Withdrawal.find()
                    .populate(
                        "user",
                        "name email balance"
                    )
                    .sort({
                        createdAt: -1
                    });

            res.render(
                "admin-withdrawals",
                {
                    title: "Withdrawals",
                    withdrawals
                }
            );

        } catch (error) {

            console.error(
                "Admin withdrawals error:",
                error
            );

            res.status(500).send(
                "Unable to load withdrawals."
            );

        }

    }
);

router.post(
    "/admin/withdrawals/:id/approve",
    requireAdmin,
    async (req, res) => {

        try {

            const result =
                await approveWithdrawal(
                    req.params.id
                );

            if (!result.success) {

                return res.status(400).send(
                    "Withdrawal has already been processed."
                );
            }

            console.log(
                `Withdrawal approved: ${result.withdrawal.reference}`
            );

            return res.redirect(
                "/admin/withdrawals"
            );

        } catch (error) {

            console.error(
                "Approve withdrawal error:",
                error
            );

            return res.status(500).send(
                "Unable to approve withdrawal."
            );
        }
    }
);


router.post(
    "/admin/withdrawals/:id/reject",
    requireAdmin,
    async (req, res) => {

        try {

            const note =
                req.body.adminNote?.trim() ||
                "Withdrawal rejected by admin.";

            const result =
                await rejectWithdrawal(
                    req.params.id,
                    note
                );

            if (!result.success) {

                return res.status(400).send(
                    "Withdrawal has already been processed."
                );
            }

            console.log(
                `Withdrawal rejected and refunded: ${result.withdrawal.reference}`
            );

            return res.redirect(
                "/admin/withdrawals"
            );

        } catch (error) {

            console.error(
                "Reject withdrawal error:",
                error
            );

            return res.status(500).send(
                "Unable to reject withdrawal."
            );
        }
    }
);

router.post(
    "/admin/withdrawals/:id/pay",
    requireAdmin,
    async (req, res) => {

        try {

            const result =
                await processWithdrawalPayment(
                    req.params.id
                );

            if (!result.success) {

                return res.status(400).send(
                    "Withdrawal has already been processed."
                );
            }

            console.log(
                `Withdrawal payment initiated: ${result.withdrawal.reference}`
            );

            console.log(
                `Paystack transfer reference: ${result.transferReference}`
            );

            return res.redirect(
                "/admin/withdrawals"
            );

        } catch (error) {

            console.error(
                "Withdrawal payment error:",
                error.response?.data ||
                error.message
            );

            return res.status(500).send(
                error.response?.data?.message ||
                "Unable to initiate withdrawal payment."
            );
        }
    }
);

/*
    =========================
    USER DETAILS
    =========================
*/

router.get(
    "/admin/users/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const user = await User.findById(
                req.params.id
            );

            if (!user) {

                return res.status(404).send(
                    "User not found."
                );

            }

            const bets = await Bet.find({
                user: user._id
            })
                .sort({ createdAt: -1 })
                .limit(20);

            const totalBets = await Bet.countDocuments({
                user: user._id
            });

            const wonBets = await Bet.countDocuments({
                user: user._id,
                status: "won"
            });

            const lostBets = await Bet.countDocuments({
                user: user._id,
                status: "lost"
            });

            const pendingBets = await Bet.countDocuments({
                user: user._id,
                status: "pending"
            });

            res.render("admin-user-details", {

                title: "User Details",

                user,

                bets,

                totalBets,

                wonBets,

                lostBets,

                pendingBets

            });

        } catch (error) {

            console.error(
                "Admin user details error:",
                error
            );

            res.status(500).send(
                "Unable to load user details."
            );

        }

    }
);

/*
    =========================
    BET DETAILS
    =========================
*/

router.get(
    "/admin/bets/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const bet = await Bet.findById(
                req.params.id
            ).populate(
                "user",
                "name email balance"
            );

            if (!bet) {

                return res.status(404).send(
                    "Bet not found."
                );

            }

            res.render("admin-bet-details", {
                title: "Bet Details",
                bet
            });

        } catch (error) {

            console.error(
                "Admin bet details error:",
                error
            );

            res.status(500).send(
                "Unable to load bet details."
            );

        }

    }
);


/*
    =========================
    SETTLE BET
    =========================
*/

router.post(
    "/admin/bets/:betId/settle",
    requireAdmin,
    async (req, res) => {

        try {

            const {
                eventId,
                homeTeam,
                awayTeam,
                homeScore,
                awayScore
            } = req.body;


            if (
                !eventId ||
                !homeTeam ||
                !awayTeam ||
                homeScore === undefined ||
                awayScore === undefined
            ) {

                return res.status(400).send(
                    "Missing match information."
                );

            }


            const parsedHomeScore = Number(
                homeScore
            );

            const parsedAwayScore = Number(
                awayScore
            );


            if (
                !Number.isFinite(parsedHomeScore) ||
                !Number.isFinite(parsedAwayScore) ||
                parsedHomeScore < 0 ||
                parsedAwayScore < 0
            ) {

                return res.status(400).send(
                    "Invalid match score."
                );

            }


            const bet = await Bet.findById(
                req.params.betId
            );


            if (!bet) {

                return res.status(404).send(
                    "Bet not found."
                );

            }


            const selectionExists =
                bet.selections.some(
                    selection =>
                        selection.eventId === eventId &&
                        selection.status === "pending"
                );


            if (!selectionExists) {

                return res.status(400).send(
                    "This selection is already settled or does not belong to this bet."
                );

            }


            await settleEvent({

                eventId,

                homeTeam,

                awayTeam,

                homeScore: parsedHomeScore,

                awayScore: parsedAwayScore

            });


            res.redirect(
                `/admin/bets/${req.params.betId}`
            );

        } catch (error) {

            console.error(
                "Admin settlement error:",
                error
            );

            res.status(500).send(
                "Unable to settle bet."
            );

        }

    }
);


/*
    =========================
    WALLET MANAGEMENT PAGE
    =========================
*/

router.get(
    "/admin/users/:id/wallet",
    requireAdmin,
    async (req, res) => {

        try {

            const user = await User.findById(
                req.params.id
            );

            if (!user) {
                return res.status(404).send(
                    "User not found."
                );
            }

            const transactions = await Transaction.find({
                user: user._id
            })
                .sort({ createdAt: -1 })
                .limit(50);

            res.render("admin-wallet", {

                title: "Wallet Management",

                user,

                transactions

            });

        } catch (error) {

            console.error(
                "Wallet page error:",
                error
            );

            res.status(500).send(
                "Unable to load wallet."
            );

        }

    }
);


/*
    =========================
    CREDIT USER
    =========================
*/

router.post(
    "/admin/users/:id/wallet/credit",
    requireAdmin,
    async (req, res) => {

        try {

            const amount = Number(
                req.body.amount
            );

            const description =
                req.body.description ||
                "Admin wallet credit";


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                return res.status(400).send(
                    "Invalid credit amount."
                );

            }


            await creditUser({

                userId: req.params.id,

                amount,

                type: "admin_credit",

                description

            });


            res.redirect(
                `/admin/users/${req.params.id}/wallet`
            );

        } catch (error) {

            console.error(
                "Wallet credit error:",
                error
            );

            res.status(400).send(
                error.message
            );

        }

    }
);


/*
    =========================
    DEBIT USER
    =========================
*/

router.post(
    "/admin/users/:id/wallet/debit",
    requireAdmin,
    async (req, res) => {

        try {

            const amount = Number(
                req.body.amount
            );

            const description =
                req.body.description ||
                "Admin wallet debit";


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                return res.status(400).send(
                    "Invalid debit amount."
                );

            }


            await debitUser({

                userId: req.params.id,

                amount,

                type: "admin_debit",

                description

            });


            res.redirect(
                `/admin/users/${req.params.id}/wallet`
            );

        } catch (error) {

            console.error(
                "Wallet debit error:",
                error
            );

            res.status(400).send(
                error.message
            );

        }

    }
);


module.exports = router;