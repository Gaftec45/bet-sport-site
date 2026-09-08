const Bet = require("../models/Bet");

const {
    getFootballEventResult,
    FOOTBALL_LEAGUES
} = require("./oddsService");

const {
    getVirtualResults
} = require("./virtualSportsApi");

const {
    settleEvent,
    settleVirtualEvent
} = require("./settlementService");


/*
    =========================================================
    AUTOMATIC SETTLEMENT WORKER
    =========================================================

    Runs automatically.

    Real football:
        pending bet
            ↓
        check event
            ↓
        match completed?
            ↓
        get official result
            ↓
        settle bet
            ↓
        pay winner

    Virtual:
        pending bet
            ↓
        check event result
            ↓
        settle
            ↓
        pay winner
*/


let workerRunning = false;


/*
    =========================================================
    GET FOOTBALL LEAGUES
    =========================================================
*/

function getFootballLeagueKeys() {

    return Object.keys(FOOTBALL_LEAGUES);

}


/*
    =========================================================
    FIND FOOTBALL EVENT
    =========================================================

    A bet currently stores eventId but not league.

    Therefore we check the configured leagues until
    we find the event.
*/

async function findFootballEvent(eventId) {

    const leagues = getFootballLeagueKeys();


    for (const league of leagues) {

        try {

            const result =
                await getFootballEventResult(
                    league,
                    eventId
                );


            if (result.found) {

                return result;

            }

        } catch (error) {

            console.error(
                `[Settlement Worker] Unable to check ${league} event ${eventId}:`,
                error.message
            );

        }

    }


    return null;

}


/*
    =========================================================
    SETTLE REAL FOOTBALL
    =========================================================
*/

async function settleRealFootballBets() {

    const pendingBets = await Bet.find({

        status: "pending",

        selections: {
            $elemMatch: {
                sportType: "real",
                status: "pending"
            }
        }

    })
    .limit(500)
    .lean();


    if (!pendingBets.length) {

        console.log(
            "[Settlement Worker] No pending real football bets."
        );

        return;

    }


    /*
        Collect unique event IDs
    */

    const eventIds = new Set();


    for (const bet of pendingBets) {

        for (const selection of bet.selections) {

            if (
                selection.sportType === "real" &&
                selection.status === "pending"
            ) {

                eventIds.add(
                    String(selection.eventId)
                );

            }

        }

    }


    console.log(
        `[Settlement Worker] Checking ${eventIds.size} football events...`
    );


    /*
        Check every event
    */

    for (const eventId of eventIds) {

        try {

            const result =
                await findFootballEvent(eventId);


            /*
                Event not found in configured leagues.
            */

            if (!result) {

                console.log(
                    `[Settlement Worker] Event ${eventId} not found yet.`
                );

                continue;

            }


            /*
                Match has not finished.
            */

            if (!result.completed) {

                console.log(
                    `[Settlement Worker] Event ${eventId} is not completed yet.`
                );

                continue;

            }


            /*
                Make sure final scores exist.
            */

            if (
                !Number.isFinite(result.homeScore) ||
                !Number.isFinite(result.awayScore)
            ) {

                console.log(
                    `[Settlement Worker] Event ${eventId} completed but final score is unavailable.`
                );

                continue;

            }


            console.log(
                `[Settlement Worker] Settling football event ${eventId}:`,
                `${result.homeTeam} ${result.homeScore} - ${result.awayScore} ${result.awayTeam}`
            );


            /*
                Settle all pending bets containing
                this event.
            */

            const settlement =
                await settleEvent({

                    eventId: result.eventId,

                    homeTeam: result.homeTeam,

                    awayTeam: result.awayTeam,

                    homeScore: result.homeScore,

                    awayScore: result.awayScore

                });


            console.log(
                "[Settlement Worker] Football settlement result:",
                settlement
            );


        } catch (error) {

            console.error(
                `[Settlement Worker] Football event ${eventId} failed:`,
                error.message
            );

        }

    }

}


/*
    =========================================================
    SETTLE VIRTUAL SPORTS
    =========================================================
*/

async function settleVirtualBets() {

    const pendingBets = await Bet.find({

        status: "pending",

        selections: {
            $elemMatch: {
                sportType: "virtual",
                status: "pending"
            }
        }

    })
    .limit(500)
    .lean();


    if (!pendingBets.length) {

        console.log(
            "[Settlement Worker] No pending virtual bets."
        );

        return;

    }


    /*
        Collect unique event IDs
    */

    const eventIds = new Set();


    for (const bet of pendingBets) {

        for (const selection of bet.selections) {

            if (
                selection.sportType === "virtual" &&
                selection.status === "pending"
            ) {

                eventIds.add(
                    String(selection.eventId)
                );

            }

        }

    }


    console.log(
        `[Settlement Worker] Checking ${eventIds.size} virtual events...`
    );


    /*
        Check every virtual event
    */

    for (const eventId of eventIds) {

        try {

            const results =
                await getVirtualResults(eventId);


            if (!results) {

                continue;

            }


            /*
                Normalize SportLogic result.
            */

            let runners = [];


            if (Array.isArray(results)) {

                runners = results;

            }

            else if (
                Array.isArray(results.runners)
            ) {

                runners = results.runners;

            }

            else if (
                results.data &&
                Array.isArray(results.data)
            ) {

                runners = results.data;

            }

            else if (
                results.data &&
                Array.isArray(results.data.runners)
            ) {

                runners = results.data.runners;

            }


            /*
                No completed runners yet.
            */

            if (!runners.length) {

                continue;

            }


            /*
                Make sure at least one runner has
                a valid finishing position.
            */

            const hasResult =
                runners.some(
                    runner =>
                        Number.isFinite(
                            Number(
                                runner.finish_position
                            )
                        )
                );


            if (!hasResult) {

                continue;

            }


            console.log(
                `[Settlement Worker] Settling virtual event ${eventId}...`
            );


            const settlement =
                await settleVirtualEvent({

                    eventId,

                    runners

                });


            console.log(
                "[Settlement Worker] Virtual settlement result:",
                settlement
            );


        } catch (error) {

            console.error(
                `[Settlement Worker] Virtual event ${eventId} failed:`,
                error.message
            );

        }

    }

}


/*
    =========================================================
    RUN SETTLEMENT WORKER
    =========================================================
*/

async function runSettlementWorker() {

    /*
        Prevent overlapping workers.
    */

    if (workerRunning) {

        console.log(
            "[Settlement Worker] Previous cycle still running. Skipping."
        );

        return;

    }


    workerRunning = true;


    console.log(
        "=========================================="
    );

    console.log(
        "[Settlement Worker] Starting settlement cycle..."
    );

    console.log(
        "=========================================="
    );


    try {

        /*
            Real football
        */

        await settleRealFootballBets();


        /*
            Virtual sports
        */

        await settleVirtualBets();


    } catch (error) {

        console.error(
            "[Settlement Worker] Fatal error:",
            error
        );


    } finally {

        workerRunning = false;


        console.log(
            "[Settlement Worker] Settlement cycle finished."
        );

    }

}


module.exports = {

    runSettlementWorker,

    settleRealFootballBets,

    settleVirtualBets

};