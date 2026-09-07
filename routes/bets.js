const express = require("express");
const router = express.Router();
const { settleEvent } = require("../services/settlementService");
const Bet = require("../models/Bet");
const User = require("../models/User");

const Transaction = require("../models/Transaction");

const {
    creditUser,
    debitUser
} = require("../services/walletService");

// =============================
// MY BETS PAGE
// =============================

router.get("/my-bets", async (req, res) => {

    try {

        // User must be logged in

        if (!req.session.userId) {
            return res.redirect("/login");
        }


        // Find all bets belonging to this user

        const bets = await Bet.find({
            user: req.session.userId
        })
        .sort({ createdAt: -1 });


        res.render("my-bets", {
            title: "My Bets",
            bets
        });


    } catch (error) {

        console.error("My Bets error:", error);

        res.status(500).send("Unable to load your bets.");

    }

});


router.post("/api/bets", async (req, res) => {

    try {

        if (!req.session.userId) {

            return res.status(401).json({
                success: false,
                message: "Please login before placing a bet."
            });

        }


        const {
            selections,
            stake,
            totalOdds,
            potentialWin
        } = req.body;


        if (
            !Array.isArray(selections) ||
            selections.length === 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Your bet slip is empty."
            });

        }


        const parsedStake = Number(stake);
        const parsedOdds = Number(totalOdds);
        const parsedPotentialWin = Number(potentialWin);


        if (
            !Number.isFinite(parsedStake) ||
            parsedStake <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid stake."
            });

        }


        if (
            !Number.isFinite(parsedOdds) ||
            parsedOdds <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid total odds."
            });

        }


        if (
            !Number.isFinite(parsedPotentialWin) ||
            parsedPotentialWin <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid potential win."
            });

        }


        const user = await User.findById(
            req.session.userId
        );


        if (!user) {

            return res.status(401).json({
                success: false,
                message: "User account not found."
            });

        }


        if (user.balance < parsedStake) {

            return res.status(400).json({
                success: false,
                message: "Insufficient balance."
            });

        }


        /*
            Prepare selections
        */

        const preparedSelections =
            selections.map(selection => ({

                eventId: selection.eventId,

                homeTeam: selection.homeTeam,

                awayTeam: selection.awayTeam,

                selection: selection.selection,

                odds: Number(selection.odds),

                status: "pending",

                result: null

            }));


        /*
            Create bet
        */

        const bet = await Bet.create({

            user: user._id,

            selections: preparedSelections,

            stake: parsedStake,

            totalOdds: parsedOdds,

            potentialWin: parsedPotentialWin,

            status: "pending",

            payoutProcessed: false

        });


        /*
            Deduct stake
        */

        const balanceBefore = user.balance;

        user.balance -= parsedStake;

        await user.save();


        /*
            Record transaction
        */

        await Transaction.create({

            user: user._id,

            type: "bet_stake",

            amount: parsedStake,

            balanceBefore,

            balanceAfter: user.balance,

            status: "completed",

            description: `Stake for bet ${bet._id}`,

            reference: `BET_STAKE_${bet._id}`

        });


        res.json({

            success: true,

            message: "Bet placed successfully.",

            bet: {

                id: bet._id,

                stake: bet.stake,

                totalOdds: bet.totalOdds,

                potentialWin: bet.potentialWin,

                status: bet.status

            },

            balance: user.balance

        });


    } catch (error) {

        console.error(
            "Place bet error:",
            error
        );


        res.status(500).json({

            success: false,

            message: "Unable to place bet."

        });

    }

});


// =============================
// BET DETAILS
// =============================

router.get("/my-bets/:id", async (req, res) => {

    try {

        // User must be logged in

        if (!req.session.userId) {
            return res.redirect("/login");
        }


        // Find the bet belonging to this user

        const bet = await Bet.findOne({
            _id: req.params.id,
            user: req.session.userId
        });


        if (!bet) {

            return res.status(404).send(
                "Bet not found."
            );

        }


        res.render("bet-details", {
            title: "Bet Details",
            bet
        });


    } catch (error) {

        console.error("Bet details error:", error);

        res.status(500).send(
            "Unable to load bet details."
        );

    }

});


// =============================
// TEST SETTLEMENT
// =============================

router.post("/api/bets/test-settle", async (req, res) => {

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

            return res.status(400).json({
                success: false,
                message: "Missing match information."
            });

        }


        const result = await settleEvent({

            eventId,

            homeTeam,

            awayTeam,

            homeScore: Number(homeScore),

            awayScore: Number(awayScore)

        });
 

        res.json(result);


    } catch (error) {

        console.error(
            "Test settlement error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to settle event."
        });

    }

});

module.exports = router;