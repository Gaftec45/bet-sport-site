const express = require("express");
const router = express.Router();

const {
    getFootballOdds,
    FOOTBALL_LEAGUES
} = require("../services/oddsService");


router.get("/api/odds/football", async (req, res) => {

    try {

        const league = req.query.league || "epl";

        const result = await getFootballOdds(league);

        res.json({
            success: true,
            league: result.league,
            count: result.games.length,
            data: result.games
        });

    } catch (error) {

        console.error("Football odds route error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch football odds"
        });
    }

});


router.get("/api/football/leagues", (req, res) => {

    res.json({
        success: true,
        data: FOOTBALL_LEAGUES
    });

});


module.exports = router;