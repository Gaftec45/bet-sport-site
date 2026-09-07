const Bet = require("../models/Bet");
const Transaction = require("../models/Transaction");
const { creditUser } = require("./walletService");


/*
    Settle all bets containing a specific event.

    result:

    {
        eventId: "event-id",
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        homeScore: 2,
        awayScore: 1
    }
*/

async function settleEvent(result) {

    const {
        eventId,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore
    } = result;


    /*
        Determine match result
    */

    let matchResult;

    if (homeScore > awayScore) {

        matchResult = homeTeam;

    } else if (awayScore > homeScore) {

        matchResult = awayTeam;

    } else {

        matchResult = "Draw";

    }


    /*
        Find pending bets containing this event
    */

    const bets = await Bet.find({

        status: "pending",

        selections: {
            $elemMatch: {
                eventId,
                status: "pending"
            }
        }

    });


    /*
        Process each bet
    */

    for (const bet of bets) {

        let selectionChanged = false;


        /*
            Update the selection belonging to this event
        */

        for (const selection of bet.selections) {

            if (
                selection.eventId === eventId &&
                selection.status === "pending"
            ) {

                selection.result = matchResult;


                if (selection.selection === matchResult) {

                    selection.status = "won";

                } else {

                    selection.status = "lost";

                }


                selectionChanged = true;

            }

        }


        if (!selectionChanged) {
            continue;
        }


        /*
            Determine overall bet status
        */

        const hasLostSelection =
            bet.selections.some(
                selection =>
                    selection.status === "lost"
            );


        const allSelectionsWon =
            bet.selections.every(
                selection =>
                    selection.status === "won"
            );


        if (hasLostSelection) {

            bet.status = "lost";

        } else if (allSelectionsWon) {

            bet.status = "won";

        } else {

            bet.status = "pending";

        }


        /*
            PAY WINNINGS
        */

        if (
            bet.status === "won" &&
            !bet.payoutProcessed
        ) {

            try {

                await creditUser({

                    userId: bet.user,

                    amount: bet.potentialWin,

                    type: "bet_win",

                    description:
                        `Winnings for bet ${bet._id}`

                });


                /*
                    Prevent duplicate payout
                */

                bet.payoutProcessed = true;


                console.log(
                    `Bet ${bet._id} winnings paid: ₦${bet.potentialWin}`
                );


            } catch (error) {

                console.error(
                    `Payout error for bet ${bet._id}:`,
                    error
                );

                /*
                    Keep payoutProcessed false
                    so it can be retried safely.
                */

            }

        }


        /*
            Mark completed bets as settled
        */

        if (
            bet.status === "won" ||
            bet.status === "lost"
        ) {

            bet.settledAt = new Date();

        }


        await bet.save();

    }


    return {

        success: true,

        eventId,

        result: matchResult,

        betsProcessed: bets.length

    };

}


module.exports = {
    settleEvent
};