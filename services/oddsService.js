const axios = require("axios");

const ODDS_API_URL = "https://api.the-odds-api.com/v4";

const FOOTBALL_LEAGUES = {
    epl: {
        key: "soccer_epl",
        name: "Premier League"
    },

    laliga: {
        key: "soccer_spain_la_liga",
        name: "La Liga"
    },

    bundesliga: {
        key: "soccer_germany_bundesliga",
        name: "Bundesliga"
    },

    seriea: {
        key: "soccer_italy_serie_a",
        name: "Serie A"
    },

    ligue1: {
        key: "soccer_france_ligue_one",
        name: "Ligue 1"
    },

    champions: {
        key: "soccer_uefa_champs_league",
        name: "Champions League"
    }
};


async function getFootballOdds(league = "epl") {

    const selectedLeague = FOOTBALL_LEAGUES[league];

    if (!selectedLeague) {
        throw new Error("Invalid football league");
    }

    try {

        const response = await axios.get(
            `${ODDS_API_URL}/sports/${selectedLeague.key}/odds`,
            {
                params: {
                    regions: "eu",
                    markets: "h2h",
                    oddsFormat: "decimal",
                    apiKey: process.env.ODDS_API_KEY
                }
            }
        );

        return {
            league: selectedLeague,
            games: response.data
        };

    } catch (error) {

        console.error(
            "Odds API error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


module.exports = {
    getFootballOdds,
    FOOTBALL_LEAGUES
};