const express = require("express");
const router = express.Router();

const {
    getFootballOdds,
    getFootballScores,
    getCompletedFootballResults,
    getLiveFootballGames,
    getFootballEventOdds,
    getFootballEventMarkets,
    getFootballEventResult,
    checkFootballResult,
    getSports,
    FOOTBALL_LEAGUES
} = require("../services/oddsService");


/*
=========================================================
FOOTBALL ODDS
=========================================================
*/

router.get("/api/football/odds", async (req, res) => {

    try {

        const league = req.query.league || "epl";

        const result = await getFootballOdds(league);

        res.json({
            success: true,
            league: result.league,
            count: result.games.length,
            data: result.games,
            usage: result.usage
        });

    } catch (error) {

        console.error(
            "Football odds route error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to fetch football odds"
        });

    }

});


/*
=========================================================
FOOTBALL SCORES
=========================================================

Returns upcoming, live and recently completed games.

Example:

/api/football/scores?league=epl

Optional:

/api/football/scores?league=epl&daysFrom=1

=========================================================
*/

router.get("/api/football/scores", async (req, res) => {

    try {

        const league = req.query.league || "epl";

        const daysFrom = req.query.daysFrom
            ? Number(req.query.daysFrom)
            : undefined;

        const result = await getFootballScores(
            league,
            {
                daysFrom
            }
        );

        res.json({
            success: true,
            league: result.league,
            count: result.games.length,
            data: result.games,
            usage: result.usage
        });

    } catch (error) {

        console.error(
            "Football scores route error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to fetch football scores"
        });

    }

});


/*
=========================================================
LIVE FOOTBALL
=========================================================
*/

router.get("/api/football/live", async (req, res) => {

    try {

        const league = req.query.league || "epl";

        const result = await getLiveFootballGames(
            league
        );

        res.json({
            success: true,
            league: result.league,
            count: result.games.length,
            data: result.games,
            usage: result.usage
        });

    } catch (error) {

        console.error(
            "Live football route error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to fetch live football games"
        });

    }

});


/*
=========================================================
COMPLETED FOOTBALL RESULTS
=========================================================

Used later by the automatic settlement system.

=========================================================
*/

router.get("/api/football/results", async (req, res) => {

    try {

        const league = req.query.league || "epl";

        const result = await getCompletedFootballResults(
            league
        );

        res.json({
            success: true,
            league: result.league,
            count: result.games.length,
            data: result.games,
            usage: result.usage
        });

    } catch (error) {

        console.error(
            "Football results route error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to fetch football results"
        });

    }

});


/*
=========================================================
SINGLE EVENT ODDS
=========================================================

Example:

/api/football/event/EVENT_ID/odds?league=epl

=========================================================
*/

router.get(
    "/api/football/event/:eventId/odds",
    async (req, res) => {

        try {

            const {
                eventId
            } = req.params;

            const league =
                req.query.league || "epl";

            const result =
                await getFootballEventOdds(
                    league,
                    eventId
                );

            res.json({
                success: true,
                league: result.league,
                data: result.event,
                usage: result.usage
            });

        } catch (error) {

            console.error(
                "Football event odds route error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Unable to fetch event odds"
            });

        }

    }
);


/*
=========================================================
EVENT MARKETS
=========================================================

Example:

/api/football/event/EVENT_ID/markets?league=epl

=========================================================
*/

router.get(
    "/api/football/event/:eventId/markets",
    async (req, res) => {

        try {

            const {
                eventId
            } = req.params;

            const league =
                req.query.league || "epl";

            const result =
                await getFootballEventMarkets(
                    league,
                    eventId
                );

            res.json({
                success: true,
                league: result.league,
                data: result.event,
                usage: result.usage
            });

        } catch (error) {

            console.error(
                "Football event markets route error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Unable to fetch event markets"
            });

        }

    }
);


/*
=========================================================
SINGLE EVENT RESULT
=========================================================

Example:

/api/football/event/EVENT_ID/result?league=epl

=========================================================
*/

router.get(
    "/api/football/event/:eventId/result",
    async (req, res) => {

        try {

            const {
                eventId
            } = req.params;

            const league =
                req.query.league || "epl";

            const result =
                await getFootballEventResult(
                    league,
                    eventId
                );

            res.json({
                success: true,
                league: result.league,
                found: result.found,
                completed: result.completed,
                data: result.event
            });

        } catch (error) {

            console.error(
                "Football event result route error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Unable to fetch football event result"
            });

        }

    }
);


/*
=========================================================
CHECK RESULT
=========================================================

This gives us a settlement-friendly response.

Example:

/api/football/event/EVENT_ID/check-result?league=epl

Possible status:

PENDING
COMPLETED
NOT_FOUND

=========================================================
*/

router.get(
    "/api/football/event/:eventId/check-result",
    async (req, res) => {

        try {

            const {
                eventId
            } = req.params;

            const league =
                req.query.league || "epl";

            const result =
                await checkFootballResult(
                    league,
                    eventId
                );

            res.json({
                success: true,
                league,
                data: result
            });

        } catch (error) {

            console.error(
                "Football result checker route error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Unable to check football result"
            });

        }

    }
);


/*
=========================================================
FOOTBALL LEAGUES
=========================================================
*/

router.get("/api/football/leagues", (req, res) => {

    res.json({
        success: true,
        data: FOOTBALL_LEAGUES
    });

});


/*
=========================================================
AVAILABLE SPORTS
=========================================================
*/

router.get("/api/football/sports", async (req, res) => {

    try {

        const all =
            req.query.all === "true";

        const result =
            await getSports(all);

        res.json({
            success: true,
            count: result.length,
            data: result
        });

    } catch (error) {

        console.error(
            "Football sports route error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to fetch available sports"
        });

    }

});


/*
=========================================================
EXPORT
=========================================================
*/

module.exports = router;