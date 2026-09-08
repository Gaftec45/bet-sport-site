const express = require("express");
const router = express.Router();

const {
    getVirtualGameTypes,
    getVirtualGameTypeInfo,
    getVirtualEvents,
    getUpcomingVirtualGames,
    getOpenVirtualGames,
    getVirtualEvent,
    getVirtualResults,
    getVirtualMarkets,
    getVirtualApiUsage
} = require("../services/virtualSportsApi");



/*
=========================================================
 GET VIRTUAL GAME TYPES
=========================================================

Example:
GET /api/virtual/game-types
*/

router.get("/api/virtual/game-types", async (req, res) => {

    try {

        const result = await getVirtualGameTypes();

        const games = result.data || [];

        res.json({
            success: true,
            count: games.length,
            data: games
        });

    } catch (error) {

        console.error(
            "Virtual game types route error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to fetch virtual game types"
        });

    }

});



/*
=========================================================
 GET VIRTUAL GAME TYPE INFO
=========================================================

Example:
GET /api/virtual/game-types/123/info
*/

router.get("/api/virtual/game-types/:gameTypeId/info", async (req, res) => {

    try {

        const {
            gameTypeId
        } = req.params;


        const result = await getVirtualGameTypeInfo(
            gameTypeId
        );


        res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Virtual game type info route error:",
            error
        );


        res.status(500).json({
            success: false,
            message: "Unable to fetch virtual game type"
        });

    }

});



/*
=========================================================
 GET VIRTUAL EVENTS
=========================================================

Examples:

GET /api/virtual/events

GET /api/virtual/events?status=open

GET /api/virtual/events?status=scheduled

GET /api/virtual/events?gameTypeId=123

GET /api/virtual/events?status=open&perPage=20
*/

router.get("/api/virtual/events", async (req, res) => {
    try {
        const { status, gameTypeId, perPage, cursor } = req.query;

        const result = await getVirtualEvents({
            status,
            gameTypeId,
            perPage: perPage ? Number(perPage) : 25,
            cursor
        });

        res.json(result);

    } catch (error) {
        console.error("Virtual events route error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch virtual events"
        });
    }
});



/*
=========================================================
 GET UPCOMING VIRTUAL GAMES
=========================================================

Example:

GET /api/virtual/upcoming
*/

router.get("/api/virtual/upcoming", async (req, res) => {

    try {

        const result = await getUpcomingVirtualGames({

            gameTypeId: req.query.gameTypeId,

            perPage: req.query.perPage
                ? Number(req.query.perPage)
                : 25,

            cursor: req.query.cursor

        });


        res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Upcoming virtual games route error:",
            error
        );


        res.status(500).json({
            success: false,
            message: "Unable to fetch upcoming virtual games"
        });

    }

});



/*
=========================================================
 GET OPEN VIRTUAL GAMES
=========================================================

Only games currently accepting selections.

Example:

GET /api/virtual/open
*/

router.get("/api/virtual/open", async (req, res) => {

    try {

        const result = await getOpenVirtualGames({

            gameTypeId: req.query.gameTypeId,

            perPage: req.query.perPage
                ? Number(req.query.perPage)
                : 25,

            cursor: req.query.cursor

        });


        res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Open virtual games route error:",
            error
        );


        res.status(500).json({
            success: false,
            message: "Unable to fetch open virtual games"
        });

    }

});



/*
=========================================================
 GET SINGLE VIRTUAL EVENT
=========================================================

Example:

GET /api/virtual/events/abc123
*/

router.get("/api/virtual/events/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;

        const result = await getVirtualEvent(eventId);

        res.json(result);

    } catch (error) {
        console.error("Virtual event route error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch virtual event"
        });
    }
});


/*
=========================================================
 GET VIRTUAL RESULTS
=========================================================

Example:

GET /api/virtual/events/abc123/results
*/

router.get(
    "/api/virtual/events/:eventId/results",
    async (req, res) => {

        try {

            const {
                eventId
            } = req.params;


            const result = await getVirtualResults(
                eventId,
                {
                    drawNumber:
                        req.query.drawNumber,

                    finishPosition:
                        req.query.finishPosition
                }
            );


            res.json({
                success: true,
                data: result
            });

        } catch (error) {

            console.error(
                "Virtual results route error:",
                error
            );


            res.status(500).json({
                success: false,
                message: "Unable to fetch virtual results"
            });

        }

    }
);



/*
=========================================================
 GET VIRTUAL MARKETS
=========================================================

Example:

GET /api/virtual/markets
*/

router.get("/api/virtual/markets", async (req, res) => {

    try {

        const result = await getVirtualMarkets();


        res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Virtual markets route error:",
            error
        );


        res.status(500).json({
            success: false,
            message: "Unable to fetch virtual markets"
        });

    }

});



/*
=========================================================
 GET API USAGE
=========================================================

Example:

GET /api/virtual/usage
*/

router.get("/api/virtual/usage", async (req, res) => {

    try {

        const result = await getVirtualApiUsage();


        res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Virtual API usage route error:",
            error
        );


        res.status(500).json({
            success: false,
            message: "Unable to fetch virtual API usage"
        });

    }

});



module.exports = router;