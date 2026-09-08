const mongoose = require("mongoose");

const betSelectionSchema = new mongoose.Schema(
    {
        /*
        =========================================================
        EVENT INFORMATION
        =========================================================
        */

        eventId: {
            type: String,
            required: true
        },

        /*
        real = The Odds API
        virtual = SportLogic
        */

        sportType: {
            type: String,
            enum: [
                "real",
                "virtual"
            ],
            default: "real",
            required: true
        },

        /*
        =========================================================
        EVENT DETAILS
        =========================================================
        */

        homeTeam: {
            type: String,
            default: ""
        },

        awayTeam: {
            type: String,
            default: ""
        },

        /*
        For virtual sports this can contain the
        runner/game name instead.
        */

        eventName: {
            type: String,
            default: ""
        },

        /*
        =========================================================
        BETTING MARKET
        =========================================================

        Examples:

        h2h
        totals
        spreads
        win
        place
        */

        market: {
            type: String,
            required: true,
            default: "h2h"
        },

        /*
        =========================================================
        USER SELECTION
        =========================================================

        Examples:

        HOME
        DRAW
        AWAY
        OVER
        UNDER
        Galaxia
        Treble Allowance
        */

        selection: {
            type: String,
            required: true
        },

        /*
        =========================================================
        ODDS SNAPSHOT
        =========================================================

        We save the odds at the exact moment the user places
        the bet.

        We NEVER recalculate an old bet using new odds.
        */

        odds: {
            type: Number,
            required: true,
            min: 1
        },

        /*
        =========================================================
        SETTLEMENT
        =========================================================
        */

        status: {
            type: String,
            enum: [
                "pending",
                "won",
                "lost",
                "cancelled"
            ],
            default: "pending"
        },

        result: {
            type: String,
            default: null
        },

        /*
        Provider result information.

        Useful for debugging and settlement records.
        */

        resultValue: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        /*
        =========================================================
        EXTRA MARKET DATA
        =========================================================

        Example:

        totals:
        {
            line: 2.5
        }

        spreads:
        {
            point: -1.5
        }

        virtual:
        {
            runnerId: 2506416,
            drawNumber: 4
        }
        */

        line: {
            type: Number,
            default: null
        },

        runnerId: {
            type: String,
            default: null
        },

        drawNumber: {
            type: Number,
            default: null
        }

    },
    {
        _id: true
    }
);


const betSchema = new mongoose.Schema(
    {

        /*
        =========================================================
        USER
        =========================================================
        */

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },


        /*
        =========================================================
        BET SELECTIONS
        =========================================================
        */

        selections: {
            type: [betSelectionSchema],
            required: true,
            validate: {
                validator: function (value) {
                    return Array.isArray(value) && value.length > 0;
                },
                message: "A bet must contain at least one selection"
            }
        },


        /*
        =========================================================
        STAKE
        =========================================================
        */

        stake: {
            type: Number,
            required: true,
            min: 1
        },


        /*
        =========================================================
        TOTAL ODDS
        =========================================================
        */

        totalOdds: {
            type: Number,
            required: true,
            min: 1
        },


        /*
        =========================================================
        POTENTIAL WIN
        =========================================================
        */

        potentialWin: {
            type: Number,
            required: true,
            min: 0
        },


        /*
        =========================================================
        BET STATUS
        =========================================================
        */

        status: {
            type: String,
            enum: [
                "pending",
                "won",
                "lost",
                "cancelled"
            ],
            default: "pending"
        },


        /*
        =========================================================
        PAYOUT PROTECTION
        =========================================================

        Prevents the same winning bet from being paid twice.
        */

        payoutProcessed: {
            type: Boolean,
            default: false
        },


        /*
        =========================================================
        SETTLEMENT
        =========================================================
        */

        settledAt: {
            type: Date,
            default: null
        },


        /*
        =========================================================
        BET REFERENCE
        =========================================================

        Gives every bet its own unique reference.

        Example:

        BET-1725893829-ABC123
        */

        reference: {
            type: String,
            unique: true,
            sparse: true
        },


        /*
        =========================================================
        CREATED
        =========================================================
        */

        createdAt: {
            type: Date,
            default: Date.now
        }

    }
);


/*
=========================================================
INDEXES
=========================================================
*/

betSchema.index({
    user: 1,
    createdAt: -1
});

betSchema.index({
    status: 1,
    createdAt: 1
});

betSchema.index({
    "selections.eventId": 1
});

betSchema.index({
    "selections.sportType": 1
});


module.exports = mongoose.model(
    "Bet",
    betSchema
);