const Bet = require("../models/Bet");
const {
    debitUser
} = require("./walletService");
const crypto = require("crypto");


/*
=========================================================
GENERATE BET REFERENCE
=========================================================
*/

function generateBetReference() {

    return `BET_${Date.now()}_${crypto
        .randomBytes(5)
        .toString("hex")
        .toUpperCase()}`;

}


/*
=========================================================
ROUND MONEY
=========================================================
*/

function roundMoney(value) {

    return Math.round(
        (value + Number.EPSILON) * 100
    ) / 100;

}


/*
=========================================================
VALIDATE SELECTION
=========================================================
*/

function validateSelection(selection) {

    if (!selection) {
        throw new Error("Invalid bet selection.");
    }


    if (!selection.eventId) {
        throw new Error(
            "Every selection must have an event ID."
        );
    }


    if (!selection.selection) {
        throw new Error(
            "Every selection must have a selection."
        );
    }


    const odds = Number(selection.odds);


    if (
        !Number.isFinite(odds) ||
        odds < 1
    ) {
        throw new Error(
            "Invalid odds."
        );
    }


    /*
    -----------------------------------------------------
    SPORT TYPE
    -----------------------------------------------------
    */

    const sportType =
        selection.sportType || "real";


    if (
        ![
            "real",
            "virtual"
        ].includes(sportType)
    ) {

        throw new Error(
            "Invalid sport type."
        );

    }


    /*
    -----------------------------------------------------
    MARKET
    -----------------------------------------------------
    */

    const market =
        selection.market ||
        (
            sportType === "virtual"
                ? "win"
                : "h2h"
        );


    return {

        eventId:
            String(selection.eventId),

        sportType,

        homeTeam:
            selection.homeTeam || "",

        awayTeam:
            selection.awayTeam || "",

        eventName:
            selection.eventName || "",

        market,

        selection:
            String(selection.selection),

        odds,

        line:
            selection.line !== undefined &&
            selection.line !== null
                ? Number(selection.line)
                : null,

        runnerId:
            selection.runnerId
                ? String(selection.runnerId)
                : null,

        drawNumber:
            selection.drawNumber !== undefined &&
            selection.drawNumber !== null
                ? Number(selection.drawNumber)
                : null

    };

}


/*
=========================================================
CALCULATE TOTAL ODDS
=========================================================
*/

function calculateTotalOdds(selections) {

    return roundMoney(

        selections.reduce(

            (total, selection) => {

                return total *
                    Number(selection.odds);

            },

            1

        )

    );

}


/*
=========================================================
CALCULATE POTENTIAL WIN
=========================================================
*/

function calculatePotentialWin(
    stake,
    totalOdds
) {

    return roundMoney(
        stake * totalOdds
    );

}


/*
=========================================================
PLACE BET
=========================================================
*/

async function placeBet({

    userId,

    selections,

    stake

}) {

    /*
    -----------------------------------------------------
    BASIC VALIDATION
    -----------------------------------------------------
    */

    if (!userId) {
        throw new Error(
            "User ID is required."
        );
    }


    if (
        !Array.isArray(selections) ||
        selections.length === 0
    ) {

        throw new Error(
            "Your bet slip is empty."
        );

    }


    const parsedStake =
        Number(stake);


    if (
        !Number.isFinite(parsedStake) ||
        parsedStake <= 0
    ) {

        throw new Error(
            "Invalid stake amount."
        );

    }


    /*
    -----------------------------------------------------
    ROUND STAKE
    -----------------------------------------------------
    */

    const finalStake =
        roundMoney(parsedStake);


    /*
    -----------------------------------------------------
    VALIDATE ALL SELECTIONS
    -----------------------------------------------------
    */

    const validatedSelections =
        selections.map(
            validateSelection
        );


    /*
    -----------------------------------------------------
    PREVENT DUPLICATE EVENT SELECTIONS
    -----------------------------------------------------

    A single accumulator can contain multiple events,
    but the same event should not normally be selected
    twice in this first version.
    */

    const eventIds =
        validatedSelections.map(
            selection => selection.eventId
        );


    const uniqueEventIds =
        new Set(eventIds);


    if (
        uniqueEventIds.size !==
        eventIds.length
    ) {

        throw new Error(
            "The same event cannot be selected more than once."
        );

    }


    /*
    -----------------------------------------------------
    CALCULATE TOTAL ODDS
    -----------------------------------------------------
    */

    const totalOdds =
        calculateTotalOdds(
            validatedSelections
        );


    /*
    -----------------------------------------------------
    CALCULATE POTENTIAL WIN
    -----------------------------------------------------
    */

    const potentialWin =
        calculatePotentialWin(
            finalStake,
            totalOdds
        );


    /*
    -----------------------------------------------------
    DEDUCT STAKE
    -----------------------------------------------------

    This uses our atomic wallet service.

    If the user does not have enough money,
    debitUser() throws an error.
    */

    let walletResult;


    try {

        walletResult =
            await debitUser({

                userId,

                amount: finalStake,

                type: "bet_stake",

                description:
                    `Stake for sportsbook bet`

            });

    } catch (error) {

        throw new Error(
            error.message
        );

    }


    /*
    -----------------------------------------------------
    CREATE BET
    -----------------------------------------------------
    */

    let bet;


    try {

        bet = await Bet.create({

            user: userId,

            selections:
                validatedSelections,

            stake:
                finalStake,

            totalOdds,

            potentialWin,

            status: "pending",

            payoutProcessed: false,

            settledAt: null,

            reference:
                generateBetReference()

        });

    } catch (error) {

        /*
        -------------------------------------------------
        BET CREATION FAILED
        -------------------------------------------------

        The stake was already deducted.

        Refund the user so money is not lost.
        */

        try {

            await require("./walletService")
                .creditUser({

                    userId,

                    amount: finalStake,

                    type: "admin_credit",

                    description:
                        "Automatic refund for failed bet creation"

                });

        } catch (refundError) {

            console.error(
                "CRITICAL: Bet refund failed:",
                refundError
            );

        }


        throw error;

    }


    /*
    -----------------------------------------------------
    RETURN BET
    -----------------------------------------------------
    */

    return {

        success: true,

        bet,

        wallet: {

            balance:
                walletResult.user.balance,

            transaction:
                walletResult.transaction

        }

    };

}


/*
=========================================================
GET USER BETS
=========================================================
*/

async function getUserBets(
    userId,
    options = {}
) {

    const {

        status,

        limit = 50,

        page = 1

    } = options;


    const query = {
        user: userId
    };


    if (status) {

        query.status = status;

    }


    const parsedLimit =
        Math.min(
            Math.max(
                Number(limit) || 50,
                1
            ),
            100
        );


    const parsedPage =
        Math.max(
            Number(page) || 1,
            1
        );


    const skip =
        (parsedPage - 1) *
        parsedLimit;


    const [bets, total] =
        await Promise.all([

            Bet.find(query)
                .sort({
                    createdAt: -1
                })
                .skip(skip)
                .limit(parsedLimit)
                .lean(),

            Bet.countDocuments(query)

        ]);


    return {

        bets,

        pagination: {

            total,

            page: parsedPage,

            limit: parsedLimit,

            pages:
                Math.ceil(
                    total / parsedLimit
                )

        }

    };

}


/*
=========================================================
GET SINGLE BET
=========================================================
*/

async function getUserBet(
    userId,
    betId
) {

    const bet =
        await Bet.findOne({

            _id: betId,

            user: userId

        });


    if (!bet) {

        throw new Error(
            "Bet not found."
        );

    }


    return bet;

}


/*
=========================================================
EXPORT
=========================================================
*/

module.exports = {

    placeBet,

    getUserBets,

    getUserBet,

    calculateTotalOdds,

    calculatePotentialWin

};