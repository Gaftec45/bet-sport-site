const Bet = require("../models/Bet");
const { creditUser } = require("./walletService");


/*
=========================================================
NORMALIZE SELECTION
=========================================================
*/

function normalizeSelection(value) {

    return String(value || "")
        .trim()
        .toLowerCase();

}


/*
=========================================================
SETTLE FOOTBALL H2H SELECTION
=========================================================

Supported selections:

HOME
AWAY
DRAW

Also supports the actual team names:

Arsenal
Chelsea
*/

function settleFootballH2H(
    selection,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore
) {

    const selected =
        normalizeSelection(selection);

    let outcome;

    if (homeScore > awayScore) {

        outcome = "HOME";

    } else if (awayScore > homeScore) {

        outcome = "AWAY";

    } else {

        outcome = "DRAW";

    }


    /*
    -----------------------------------------------------
    ACCEPT BOTH SHORT FORM AND TEAM NAME
    -----------------------------------------------------
    */

    let won = false;

    if (outcome === "HOME") {

        won =
            selected === "home" ||
            selected === "1" ||
            selected ===
                normalizeSelection(homeTeam);

    }

    else if (outcome === "AWAY") {

        won =
            selected === "away" ||
            selected === "2" ||
            selected ===
                normalizeSelection(awayTeam);

    }

    else {

        won =
            selected === "draw" ||
            selected === "x";

    }


    return {

        won,

        outcome,

        result:
            outcome === "HOME"
                ? homeTeam
                : outcome === "AWAY"
                    ? awayTeam
                    : "Draw"

    };

}


/*
=========================================================
SETTLE FOOTBALL TOTALS
=========================================================

Example:

market: totals
selection: OVER
line: 2.5

Final score:

2 - 1

Total = 3

OVER 2.5 = WON
*/

function settleFootballTotals(
    selection,
    line,
    homeScore,
    awayScore
) {

    if (
        line === null ||
        line === undefined ||
        !Number.isFinite(Number(line))
    ) {

        throw new Error(
            "Totals market requires a valid line."
        );

    }


    const totalGoals =
        Number(homeScore) +
        Number(awayScore);

    const selected =
        normalizeSelection(selection);

    const numericLine =
        Number(line);


    let won = false;


    if (selected === "over") {

        won =
            totalGoals > numericLine;

    }

    else if (selected === "under") {

        won =
            totalGoals < numericLine;

    }

    else {

        throw new Error(
            `Invalid totals selection: ${selection}`
        );

    }


    return {

        won,

        outcome:
            `${totalGoals}`,

        result:
            `${selected.toUpperCase()} ${numericLine} — total ${totalGoals}`

    };

}


/*
=========================================================
SETTLE FOOTBALL BTTS
=========================================================
*/

function settleFootballBTTS(
    selection,
    homeScore,
    awayScore
) {

    const selected =
        normalizeSelection(selection);


    const bothScored =
        homeScore > 0 &&
        awayScore > 0;


    let won;


    if (selected === "yes") {

        won = bothScored;

    }

    else if (selected === "no") {

        won = !bothScored;

    }

    else {

        throw new Error(
            `Invalid BTTS selection: ${selection}`
        );

    }


    return {

        won,

        outcome:
            bothScored
                ? "YES"
                : "NO",

        result:
            bothScored
                ? "Both Teams Scored"
                : "Both Teams Did Not Score"

    };

}


/*
=========================================================
SETTLE FOOTBALL SELECTION
=========================================================
*/

function settleFootballSelection(
    selection,
    result
) {

    const {

        market = "h2h",

        homeTeam,
        awayTeam,

        homeScore,
        awayScore,

        line

    } = result;


    switch (
        normalizeSelection(market)
    ) {

        case "h2h":

        case "1x2":

        case "match_result":

            return settleFootballH2H(

                selection,

                homeTeam,

                awayTeam,

                homeScore,

                awayScore

            );


        case "totals":

        case "over_under":

            return settleFootballTotals(

                selection,

                line,

                homeScore,

                awayScore

            );


        case "btts":

        case "both_teams_to_score":

            return settleFootballBTTS(

                selection,

                homeScore,

                awayScore

            );


        default:

            throw new Error(
                `Unsupported football market: ${market}`
            );

    }

}


/*
=========================================================
FIND PENDING BETS FOR EVENT
=========================================================
*/

async function findPendingBets(
    eventId,
    sportType
) {

    return Bet.find({

        status: "pending",

        selections: {

            $elemMatch: {

                eventId:
                    String(eventId),

                sportType,

                status: "pending"

            }

        }

    });

}


/*
=========================================================
UPDATE OVERALL BET STATUS
=========================================================
*/

function updateOverallBetStatus(bet) {

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

    }

    else if (allSelectionsWon) {

        bet.status = "won";

    }

    else {

        bet.status = "pending";

    }

}


/*
=========================================================
PAY WINNING BET
=========================================================

IMPORTANT:

We set the bet status and save the result after the
selection is evaluated.

Payout is protected using payoutProcessed.

For the next production-hardening step, we'll move the
payout + bet update into a MongoDB transaction.
*/

async function payWinningBet(bet) {

    if (bet.status !== "won") {

        return false;

    }


    if (bet.payoutProcessed) {

        return false;

    }


    /*
    -----------------------------------------------------
    PAY USER
    -----------------------------------------------------
    */

    await creditUser({

        userId:
            bet.user,

        amount:
            bet.potentialWin,

        type:
            "bet_win",

        description:
            `Winnings for bet ${bet.reference || bet._id}`

    });


    /*
    -----------------------------------------------------
    MARK PAYOUT COMPLETE
    -----------------------------------------------------
    */

    bet.payoutProcessed = true;

    bet.settledAt = new Date();

    await bet.save();


    console.log(
        `Bet ${bet._id} winnings paid: ₦${bet.potentialWin}`
    );


    return true;

}


/*
=========================================================
SETTLE REAL FOOTBALL EVENT
=========================================================

Example:

{
    eventId: "abc123",
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

        awayScore,

        line

    } = result;


    if (!eventId) {

        throw new Error(
            "eventId is required."
        );

    }


    if (
        !homeTeam ||
        !awayTeam
    ) {

        throw new Error(
            "homeTeam and awayTeam are required."
        );

    }


    if (
        !Number.isFinite(
            Number(homeScore)
        ) ||

        !Number.isFinite(
            Number(awayScore)
        )

    ) {

        throw new Error(
            "Invalid football score."
        );

    }


    const parsedHomeScore =
        Number(homeScore);

    const parsedAwayScore =
        Number(awayScore);


    /*
    -----------------------------------------------------
    FIND BETS
    -----------------------------------------------------
    */

    const bets =
        await findPendingBets(
            eventId,
            "real"
        );


    let selectionsProcessed = 0;

    let betsWon = 0;

    let betsLost = 0;

    let betsStillPending = 0;

    let payoutsProcessed = 0;


    /*
    -----------------------------------------------------
    PROCESS EACH BET
    -----------------------------------------------------
    */

    for (const bet of bets) {

        let selectionChanged = false;


        for (
            const selection
            of bet.selections
        ) {

            if (

                selection.eventId !==
                    String(eventId) ||

                selection.sportType !==
                    "real" ||

                selection.status !==
                    "pending"

            ) {

                continue;

            }


            /*
            -------------------------------------------------
            SETTLE THIS MARKET
            -------------------------------------------------
            */

            let settlement;


            try {

                settlement =
                    settleFootballSelection(

                        selection.selection,

                        {

                            market:
                                selection.market,

                            homeTeam,

                            awayTeam,

                            homeScore:
                                parsedHomeScore,

                            awayScore:
                                parsedAwayScore,

                            line:
                                selection.line !== null
                                    ? selection.line
                                    : line

                        }

                    );

            } catch (error) {

                console.error(

                    `Unable to settle selection ` +
                    `${selection._id} ` +
                    `for bet ${bet._id}:`,

                    error.message

                );

                continue;

            }


            /*
            -------------------------------------------------
            SAVE RESULT
            -------------------------------------------------
            */

            selection.result =
                settlement.result;


            selection.resultValue = {

                homeScore:
                    parsedHomeScore,

                awayScore:
                    parsedAwayScore,

                outcome:
                    settlement.outcome

            };


            if (settlement.won) {

                selection.status =
                    "won";

            }

            else {

                selection.status =
                    "lost";

            }


            selectionChanged = true;

            selectionsProcessed++;

        }


        if (!selectionChanged) {

            continue;

        }


        /*
        -----------------------------------------------------
        UPDATE BET STATUS
        -----------------------------------------------------
        */

        updateOverallBetStatus(bet);


        /*
        -----------------------------------------------------
        BET LOST
        -----------------------------------------------------
        */

        if (
            bet.status === "lost"
        ) {

            bet.settledAt =
                new Date();

            betsLost++;

        }


        /*
        -----------------------------------------------------
        BET STILL WAITING
        -----------------------------------------------------
        */

        else if (
            bet.status === "pending"
        ) {

            betsStillPending++;

        }


        /*
        -----------------------------------------------------
        BET WON
        -----------------------------------------------------
        */

        else if (
            bet.status === "won"
        ) {

            betsWon++;

            try {

                const paid =
                    await payWinningBet(
                        bet
                    );


                if (paid) {

                    payoutsProcessed++;

                }

            } catch (error) {

                /*
                Keep payoutProcessed false.

                This means a later settlement retry
                can attempt the payout again.
                */

                console.error(

                    `Payout error for bet ${bet._id}:`,

                    error

                );

                /*
                Save the bet even though payout failed.
                */

                try {

                    await bet.save();

                } catch (saveError) {

                    console.error(
                        `Unable to save bet ${bet._id}:`,
                        saveError
                    );

                }

            }

        }

    }


    /*
    -----------------------------------------------------
    MATCH RESULT
    -----------------------------------------------------
    */

    let matchResult;


    if (
        parsedHomeScore >
        parsedAwayScore
    ) {

        matchResult =
            homeTeam;

    }

    else if (
        parsedAwayScore >
        parsedHomeScore
    ) {

        matchResult =
            awayTeam;

    }

    else {

        matchResult =
            "Draw";

    }


    return {

        success: true,

        eventId:
            String(eventId),

        result:
            matchResult,

        homeScore:
            parsedHomeScore,

        awayScore:
            parsedAwayScore,

        betsProcessed:
            bets.length,

        selectionsProcessed,

        betsWon,

        betsLost,

        betsStillPending,

        payoutsProcessed

    };

}


/*
=========================================================
SETTLE VIRTUAL EVENT
=========================================================

SportLogic result example should contain runners with
their final positions.

Example:

{
    eventId: 552518,
    runners: [
        {
            id: 2506416,
            name: "Treble Allowance",
            draw_number: 4,
            finish_position: 1
        }
    ]
}

For WIN:

finish_position === 1

For PLACE:

We use the configured place limit.
*/

async function settleVirtualEvent({

    eventId,

    runners,

    placePositions = 3

}) {

    if (!eventId) {

        throw new Error(
            "eventId is required."
        );

    }


    if (
        !Array.isArray(runners) ||
        runners.length === 0
    ) {

        throw new Error(
            "Virtual event runners/results are required."
        );

    }


    /*
    -----------------------------------------------------
    FIND PENDING VIRTUAL BETS
    -----------------------------------------------------
    */

    const bets =
        await findPendingBets(
            eventId,
            "virtual"
        );


    let selectionsProcessed = 0;

    let betsWon = 0;

    let betsLost = 0;

    let betsStillPending = 0;

    let payoutsProcessed = 0;


    /*
    -----------------------------------------------------
    CREATE QUICK RUNNER LOOKUP
    -----------------------------------------------------
    */

    const runnerMap =
        new Map();


    for (
        const runner of runners
    ) {

        if (runner.id !== undefined) {

            runnerMap.set(
                String(runner.id),
                runner
            );

        }


        if (
            runner.draw_number !==
                undefined
        ) {

            runnerMap.set(

                `draw:${runner.draw_number}`,

                runner

            );

        }


        if (runner.name) {

            runnerMap.set(

                `name:${normalizeSelection(
                    runner.name
                )}`,

                runner

            );

        }

    }


    /*
    -----------------------------------------------------
    PROCESS BETS
    -----------------------------------------------------
    */

    for (const bet of bets) {

        let selectionChanged = false;


        for (
            const selection
            of bet.selections
        ) {

            if (

                selection.eventId !==
                    String(eventId) ||

                selection.sportType !==
                    "virtual" ||

                selection.status !==
                    "pending"

            ) {

                continue;

            }


            /*
            -------------------------------------------------
            FIND RUNNER
            -------------------------------------------------
            */

            let runner = null;


            if (selection.runnerId) {

                runner =
                    runnerMap.get(
                        String(
                            selection.runnerId
                        )
                    );

            }


            if (
                !runner &&
                selection.drawNumber !== null
            ) {

                runner =
                    runnerMap.get(
                        `draw:${selection.drawNumber}`
                    );

            }


            if (!runner) {

                runner =
                    runnerMap.get(
                        `name:${normalizeSelection(
                            selection.selection
                        )}`
                    );

            }


            /*
            -------------------------------------------------
            RUNNER NOT FOUND
            -------------------------------------------------
            */

            if (!runner) {

                console.error(

                    `Runner not found for ` +
                    `bet ${bet._id}, ` +
                    `selection ${selection.selection}`

                );

                continue;

            }


            const finishPosition =
                Number(
                    runner.finish_position
                );


            if (
                !Number.isFinite(
                    finishPosition
                )
            ) {

                continue;

            }


            /*
            -------------------------------------------------
            DETERMINE MARKET
            -------------------------------------------------
            */

            const market =
                normalizeSelection(
                    selection.market || "win"
                );


            let won = false;


            /*
            -------------------------------------------------
            WIN
            -------------------------------------------------
            */

            if (

                market === "win" ||

                market === "winner"

            ) {

                won =
                    finishPosition === 1;

            }


            /*
            -------------------------------------------------
            PLACE
            -------------------------------------------------
            */

            else if (
                market === "place"
            ) {

                won =
                    finishPosition >= 1 &&
                    finishPosition <=
                        placePositions;

            }


            else {

                console.error(

                    `Unsupported virtual market ` +
                    `${selection.market} ` +
                    `for bet ${bet._id}`

                );

                continue;

            }


            /*
            -------------------------------------------------
            SAVE RESULT
            -------------------------------------------------
            */

            selection.result =
                `Finished ${finishPosition}`;


            selection.resultValue = {

                finishPosition,

                runnerId:
                    runner.id,

                drawNumber:
                    runner.draw_number,

                runnerName:
                    runner.name

            };


            if (won) {

                selection.status =
                    "won";

            }

            else {

                selection.status =
                    "lost";

            }


            selectionChanged = true;

            selectionsProcessed++;

        }


        if (!selectionChanged) {

            continue;

        }


        /*
        -----------------------------------------------------
        UPDATE OVERALL BET
        -----------------------------------------------------
        */

        updateOverallBetStatus(bet);


        if (
            bet.status === "lost"
        ) {

            bet.settledAt =
                new Date();

            betsLost++;

        }


        else if (
            bet.status === "pending"
        ) {

            betsStillPending++;

        }


        else if (
            bet.status === "won"
        ) {

            betsWon++;


            try {

                const paid =
                    await payWinningBet(
                        bet
                    );


                if (paid) {

                    payoutsProcessed++;

                }

            } catch (error) {

                console.error(

                    `Virtual payout error ` +
                    `for bet ${bet._id}:`,

                    error

                );


                try {

                    await bet.save();

                } catch (saveError) {

                    console.error(
                        `Unable to save bet ${bet._id}:`,
                        saveError
                    );

                }

            }

        }

    }


    return {

        success: true,

        eventId:
            String(eventId),

        betsProcessed:
            bets.length,

        selectionsProcessed,

        betsWon,

        betsLost,

        betsStillPending,

        payoutsProcessed

    };

}


/*
=========================================================
EXPORT
=========================================================
*/

module.exports = {

    settleEvent,

    settleVirtualEvent

};