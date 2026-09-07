const mongoose = require("mongoose");

const betSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },


    selections: [

        {

            eventId: {
                type: String,
                required: true
            },

            homeTeam: {
                type: String,
                required: true
            },

            awayTeam: {
                type: String,
                required: true
            },

            selection: {
                type: String,
                required: true
            },

            odds: {
                type: Number,
                required: true
            },

            // Settlement information

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
            }

        }

    ],


    stake: {
        type: Number,
        required: true
    },


    totalOdds: {
        type: Number,
        required: true
    },


    potentialWin: {
        type: Number,
        required: true
    },


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


    // Prevent paying the same winning bet twice

    payoutProcessed: {
        type: Boolean,
        default: false
    },


    settledAt: {
        type: Date,
        default: null
    },


    createdAt: {
        type: Date,
        default: Date.now
    }

});


module.exports = mongoose.model("Bet", betSchema);