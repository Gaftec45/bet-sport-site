const express = require("express");
const router = express.Router();

const Bet = require("../models/Bet");

const {
    settleEvent
} = require("../services/settlementService");

const {
    placeBet,
    getUserBets,
    getUserBet
} = require("../services/betService");


/*
=========================================================
MY BETS PAGE
=========================================================
*/

router.get("/my-bets", async (req, res) => {

    try {

        /*
        -------------------------------------------------
        CHECK LOGIN
        -------------------------------------------------
        */

        if (!req.session.userId) {

            return res.redirect("/login");

        }


        /*
        -------------------------------------------------
        GET USER BETS
        -------------------------------------------------
        */

        const result =
            await getUserBets(
                req.session.userId
            );


        /*
        -------------------------------------------------
        RENDER PAGE
        -------------------------------------------------
        */

        res.render("my-bets", {

            title: "My Bets",

            bets: result.bets

        });

    } catch (error) {

        console.error(
            "My Bets error:",
            error
        );

        res.status(500).send(
            "Unable to load your bets."
        );

    }

});


/*
=========================================================
PLACE BET
=========================================================

POST /api/bets

Client sends:

{
    selections: [...],
    stake: 1000
}

The server calculates:

totalOdds
potentialWin
*/

router.post("/api/bets", async (req, res) => {

    try {

        /*
        -------------------------------------------------
        CHECK LOGIN
        -------------------------------------------------
        */

        if (!req.session.userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Please login before placing a bet."

            });

        }


        /*
        -------------------------------------------------
        ONLY ACCEPT THESE VALUES
        -------------------------------------------------
        */

        const {
            selections,
            stake
        } = req.body;


        /*
        -------------------------------------------------
        PLACE BET
        -------------------------------------------------
        */

        const result =
            await placeBet({

                userId:
                    req.session.userId,

                selections,

                stake

            });


        /*
        -------------------------------------------------
        RESPONSE
        -------------------------------------------------
        */

        res.json({

            success: true,

            message:
                "Bet placed successfully.",

            bet: {

                id:
                    result.bet._id,

                reference:
                    result.bet.reference,

                stake:
                    result.bet.stake,

                totalOdds:
                    result.bet.totalOdds,

                potentialWin:
                    result.bet.potentialWin,

                status:
                    result.bet.status

            },

            balance:
                result.wallet.balance

        });

    } catch (error) {

        console.error(
            "Place bet error:",
            error
        );


        /*
        -------------------------------------------------
        KNOWN USER ERRORS
        -------------------------------------------------
        */

        const knownErrors = [

            "Your bet slip is empty.",

            "Invalid stake.",

            "Insufficient balance.",

            "User not found.",

            "User account not found.",

            "Invalid bet selection.",

            "Every selection must have an event ID.",

            "Every selection must have a selection.",

            "Invalid odds.",

            "Invalid sport type.",

            "The same event cannot be selected more than once."

        ];


        if (
            knownErrors.includes(
                error.message
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    error.message

            });

        }


        /*
        -------------------------------------------------
        SERVER ERROR
        -------------------------------------------------
        */

        res.status(500).json({

            success: false,

            message:
                "Unable to place bet."

        });

    }

});


/*
=========================================================
MY BETS API
=========================================================

Optional API endpoint for dashboards/frontend.
*/

router.get("/api/bets", async (req, res) => {

    try {

        if (!req.session.userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Please login."

            });

        }


        const result =
            await getUserBets(

                req.session.userId,

                {

                    status:
                        req.query.status,

                    page:
                        req.query.page,

                    limit:
                        req.query.limit

                }

            );


        res.json({

            success: true,

            data:
                result.bets,

            pagination:
                result.pagination

        });

    } catch (error) {

        console.error(
            "Get bets error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load bets."

        });

    }

});


/*
=========================================================
BET DETAILS PAGE
=========================================================
*/

router.get("/my-bets/:id", async (req, res) => {

    try {

        /*
        -------------------------------------------------
        CHECK LOGIN
        -------------------------------------------------
        */

        if (!req.session.userId) {

            return res.redirect("/login");

        }


        /*
        -------------------------------------------------
        GET BET
        -------------------------------------------------
        */

        const bet =
            await getUserBet(

                req.session.userId,

                req.params.id

            );


        /*
        -------------------------------------------------
        RENDER
        -------------------------------------------------
        */

        res.render("bet-details", {

            title: "Bet Details",

            bet

        });

    } catch (error) {

        console.error(
            "Bet details error:",
            error
        );


        if (
            error.message ===
            "Bet not found."
        ) {

            return res.status(404).send(
                "Bet not found."
            );

        }


        res.status(500).send(
            "Unable to load bet details."
        );

    }

});


/*
=========================================================
TEST SETTLEMENT
=========================================================

THIS IS FOR DEVELOPMENT ONLY.

We will later replace this with the automatic
settlement worker.
*/

router.post(
    "/api/bets/test-settle",
    async (req, res) => {

        try {

            const {

                eventId,

                homeTeam,

                awayTeam,

                homeScore,

                awayScore

            } = req.body;


            /*
            -------------------------------------------------
            VALIDATION
            -------------------------------------------------
            */

            if (

                !eventId ||

                !homeTeam ||

                !awayTeam ||

                homeScore === undefined ||

                awayScore === undefined

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Missing match information."

                });

            }


            const parsedHomeScore =
                Number(homeScore);

            const parsedAwayScore =
                Number(awayScore);


            if (

                !Number.isFinite(
                    parsedHomeScore
                ) ||

                !Number.isFinite(
                    parsedAwayScore
                ) ||

                parsedHomeScore < 0 ||

                parsedAwayScore < 0

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid match score."

                });

            }


            /*
            -------------------------------------------------
            SETTLE EVENT
            -------------------------------------------------
            */

            const result =
                await settleEvent({

                    eventId,

                    homeTeam,

                    awayTeam,

                    homeScore:
                        parsedHomeScore,

                    awayScore:
                        parsedAwayScore

                });


            res.json(result);

        } catch (error) {

            console.error(
                "Test settlement error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to settle event."

            });

        }

    }
);


module.exports = router;