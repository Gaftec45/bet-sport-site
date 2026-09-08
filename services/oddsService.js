const axios = require("axios");

const ODDS_API_URL = "https://api.the-odds-api.com/v4";

const oddsApi = axios.create({
    baseURL: ODDS_API_URL,
    timeout: 30000,
    headers: {
        Accept: "application/json"
    }
});


/*
=========================================================
FOOTBALL LEAGUES
=========================================================
*/

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


/*
=========================================================
DEFAULT SETTINGS
=========================================================
*/

const DEFAULT_REGION = "eu";

const DEFAULT_ODDS_FORMAT = "decimal";

const DEFAULT_MARKETS = "h2h";


/*
=========================================================
VALIDATION
=========================================================
*/

function getLeague(league = "epl") {

    const selectedLeague = FOOTBALL_LEAGUES[league];

    if (!selectedLeague) {
        throw new Error(
            `Invalid football league: ${league}`
        );
    }

    return selectedLeague;
}


function getApiKey() {

    if (!process.env.ODDS_API_KEY) {
        throw new Error(
            "ODDS_API_KEY is not configured"
        );
    }

    return process.env.ODDS_API_KEY;
}


/*
=========================================================
GET FOOTBALL ODDS
=========================================================

Returns upcoming/live football games with bookmaker odds.

Example:

getFootballOdds("epl")

Markets:
h2h
spreads
totals

You can also pass custom markets.
=========================================================
*/

async function getFootballOdds(
    league = "epl",
    options = {}
) {

    const selectedLeague = getLeague(league);

    const {
        regions = DEFAULT_REGION,
        markets = DEFAULT_MARKETS,
        oddsFormat = DEFAULT_ODDS_FORMAT,
        dateFormat
    } = options;

    try {

        const params = {

            regions,

            markets,

            oddsFormat,

            apiKey: getApiKey()

        };

        if (dateFormat) {
            params.dateFormat = dateFormat;
        }

        const response = await oddsApi.get(
            `/sports/${selectedLeague.key}/odds`,
            {
                params
            }
        );

        return {

            league: selectedLeague,

            games: response.data,

            usage: {

                remaining:
                    response.headers["x-requests-remaining"],

                used:
                    response.headers["x-requests-used"],

                last:
                    response.headers["x-requests-last"]

            }

        };

    } catch (error) {

        console.error(
            "Odds API football odds error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


/*
=========================================================
GET FOOTBALL SCORES / RESULTS
=========================================================

Returns:

- upcoming games
- live games
- recently completed games

daysFrom:
1 - previous day
2 - previous 2 days
3 - previous 3 days

For settlement we will normally use:

daysFrom = 1

because completed games are included.
=========================================================
*/

async function getFootballScores(
    league = "epl",
    options = {}
) {

    const selectedLeague = getLeague(league);

    const {
        daysFrom,
        dateFormat
    } = options;

    try {

        const params = {

            apiKey: getApiKey()

        };

        if (daysFrom !== undefined) {

            const parsedDays = Number(daysFrom);

            if (
                !Number.isInteger(parsedDays) ||
                parsedDays < 1 ||
                parsedDays > 3
            ) {
                throw new Error(
                    "daysFrom must be between 1 and 3"
                );
            }

            params.daysFrom = parsedDays;
        }

        if (dateFormat) {
            params.dateFormat = dateFormat;
        }

        const response = await oddsApi.get(
            `/sports/${selectedLeague.key}/scores`,
            {
                params
            }
        );

        return {

            league: selectedLeague,

            games: response.data,

            usage: {

                remaining:
                    response.headers["x-requests-remaining"],

                used:
                    response.headers["x-requests-used"],

                last:
                    response.headers["x-requests-last"]

            }

        };

    } catch (error) {

        console.error(
            "Odds API football scores error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


/*
=========================================================
GET COMPLETED FOOTBALL RESULTS
=========================================================

Convenience function specifically for settlement.

Only returns games where:

completed === true
=========================================================
*/

async function getCompletedFootballResults(
    league = "epl"
) {

    const result = await getFootballScores(
        league,
        {
            daysFrom: 1
        }
    );

    const completedGames = result.games.filter(
        game => game.completed === true
    );

    return {

        league: result.league,

        games: completedGames,

        count: completedGames.length,

        usage: result.usage

    };

}


/*
=========================================================
GET LIVE FOOTBALL GAMES
=========================================================

Uses the scores endpoint and returns games that are
currently not completed and have scores.

=========================================================
*/

async function getLiveFootballGames(
    league = "epl"
) {

    const result = await getFootballScores(
        league
    );

    const liveGames = result.games.filter(
        game =>
            game.completed !== true &&
            Array.isArray(game.scores) &&
            game.scores.length > 0
    );

    return {

        league: result.league,

        games: liveGames,

        count: liveGames.length,

        usage: result.usage

    };

}


/*
=========================================================
GET UPCOMING FOOTBALL GAMES
=========================================================

This uses the odds endpoint because it returns upcoming
games together with betting odds.
=========================================================
*/

async function getUpcomingFootballGames(
    league = "epl",
    options = {}
) {

    return getFootballOdds(
        league,
        options
    );

}


/*
=========================================================
GET SINGLE EVENT ODDS
=========================================================

Useful when a customer opens a specific match and we
need fresh odds for that match.

Example:

getFootballEventOdds(
    "epl",
    "event-id"
)

=========================================================
*/

async function getFootballEventOdds(
    league = "epl",
    eventId,
    options = {}
) {

    if (!eventId) {
        throw new Error(
            "eventId is required"
        );
    }

    const selectedLeague = getLeague(league);

    const {
        regions = DEFAULT_REGION,
        markets = DEFAULT_MARKETS,
        oddsFormat = DEFAULT_ODDS_FORMAT,
        dateFormat
    } = options;

    try {

        const params = {

            regions,

            markets,

            oddsFormat,

            apiKey: getApiKey()

        };

        if (dateFormat) {
            params.dateFormat = dateFormat;
        }

        const response = await oddsApi.get(
            `/sports/${selectedLeague.key}/events/${eventId}/odds`,
            {
                params
            }
        );

        return {

            league: selectedLeague,

            event: response.data,

            usage: {

                remaining:
                    response.headers["x-requests-remaining"],

                used:
                    response.headers["x-requests-used"],

                last:
                    response.headers["x-requests-last"]

            }

        };

    } catch (error) {

        console.error(
            "Odds API event odds error:",
            error.response?.data || error.message
        );

        throw error;
    }

}


/*
=========================================================
GET AVAILABLE MARKETS FOR AN EVENT
=========================================================

This lets us discover which market keys bookmakers have
recently provided for a particular event.
=========================================================
*/

async function getFootballEventMarkets(
    league = "epl",
    eventId,
    options = {}
) {

    if (!eventId) {
        throw new Error(
            "eventId is required"
        );
    }

    const selectedLeague = getLeague(league);

    const {
        regions = DEFAULT_REGION,
        dateFormat
    } = options;

    try {

        const params = {

            regions,

            apiKey: getApiKey()

        };

        if (dateFormat) {
            params.dateFormat = dateFormat;
        }

        const response = await oddsApi.get(
            `/sports/${selectedLeague.key}/events/${eventId}/markets`,
            {
                params
            }
        );

        return {

            league: selectedLeague,

            event: response.data,

            usage: {

                remaining:
                    response.headers["x-requests-remaining"],

                used:
                    response.headers["x-requests-used"],

                last:
                    response.headers["x-requests-last"]

            }

        };

    } catch (error) {

        console.error(
            "Odds API event markets error:",
            error.response?.data || error.message
        );

        throw error;
    }

}


/*
=========================================================
GET ALL SPORTS
=========================================================

Useful for discovering available sport keys.

This endpoint does not count against the usage quota.
=========================================================
*/

async function getSports(
    all = false
) {

    try {

        const response = await oddsApi.get(
            "/sports",
            {
                params: {

                    all,

                    apiKey: getApiKey()

                }
            }
        );

        return response.data;

    } catch (error) {

        console.error(
            "Odds API sports error:",
            error.response?.data || error.message
        );

        throw error;
    }

}


/*
=========================================================
GET FOOTBALL EVENT RESULT
=========================================================

This searches the scores endpoint for one particular
event ID.

This will be useful for automatic settlement.

=========================================================
*/


async function getFootballEventResult(
    league = "epl",
    eventId
) {

    if (!eventId) {

        throw new Error(
            "eventId is required"
        );

    }


    const result = await getFootballScores(
        league,
        {
            daysFrom: 3
        }
    );


    const event = result.games.find(
        game =>
            String(game.id) === String(eventId)
    );


    /*
        =========================================
        EVENT NOT FOUND
        =========================================
    */

    if (!event) {

        return {

            found: false,

            completed: false,

            eventId: String(eventId),

            homeTeam: null,

            awayTeam: null,

            homeScore: null,

            awayScore: null,

            event: null,

            league: result.league

        };

    }


    /*
        =========================================
        EVENT FOUND BUT NOT COMPLETED
        =========================================
    */

    if (event.completed !== true) {

        return {

            found: true,

            completed: false,

            eventId: String(event.id),

            homeTeam: event.home_team,

            awayTeam: event.away_team,

            homeScore: null,

            awayScore: null,

            event,

            league: result.league

        };

    }


    /*
        =========================================
        EXTRACT FINAL SCORES
        =========================================
    */

    let homeScore = null;
    let awayScore = null;


    if (Array.isArray(event.scores)) {

        const homeScoreEntry =
            event.scores.find(
                score =>
                    score.name === event.home_team
            );


        const awayScoreEntry =
            event.scores.find(
                score =>
                    score.name === event.away_team
            );


        if (homeScoreEntry) {

            homeScore =
                Number(homeScoreEntry.score);

        }


        if (awayScoreEntry) {

            awayScore =
                Number(awayScoreEntry.score);

        }

    }


    /*
        =========================================
        VALIDATE FINAL SCORES
        =========================================
    */

    if (
        !Number.isFinite(homeScore) ||
        !Number.isFinite(awayScore)
    ) {

        console.error(
            `Completed event ${eventId} has no valid final score.`,
            event
        );


        return {

            found: true,

            completed: true,

            eventId: String(event.id),

            homeTeam: event.home_team,

            awayTeam: event.away_team,

            homeScore: null,

            awayScore: null,

            event,

            league: result.league

        };

    }


    /*
        =========================================
        NORMALIZED RESULT
        =========================================
    */

    return {

        found: true,

        completed: true,

        eventId: String(event.id),

        homeTeam: event.home_team,

        awayTeam: event.away_team,

        homeScore,

        awayScore,

        event,

        league: result.league

    };

}



/*
=========================================================
CHECK FOOTBALL RESULT
=========================================================

Returns a simple settlement-friendly structure.

Example:

{
    completed: true,
    homeTeam: "...",
    awayTeam: "...",
    homeScore: 2,
    awayScore: 1,
    winner: "HOME"
}

=========================================================
*/

async function checkFootballResult(
    league = "epl",
    eventId
) {

    const result = await getFootballEventResult(
        league,
        eventId
    );

    if (!result.found) {

        return {

            completed: false,

            status: "NOT_FOUND",

            event: null

        };

    }

    const event = result.event;

    if (!event.completed) {

        return {

            completed: false,

            status: "PENDING",

            event

        };

    }

    let homeScore = null;
    let awayScore = null;

    if (Array.isArray(event.scores)) {

        const home = event.scores.find(
            score =>
                score.name === event.home_team
        );

        const away = event.scores.find(
            score =>
                score.name === event.away_team
        );

        if (home) {
            homeScore = Number(home.score);
        }

        if (away) {
            awayScore = Number(away.score);
        }

    }

    let winner = "DRAW";

    if (
        homeScore !== null &&
        awayScore !== null
    ) {

        if (homeScore > awayScore) {

            winner = "HOME";

        } else if (awayScore > homeScore) {

            winner = "AWAY";

        }

    }

    return {

        completed: true,

        status: "COMPLETED",

        eventId: event.id,

        homeTeam: event.home_team,

        awayTeam: event.away_team,

        homeScore,

        awayScore,

        winner,

        event

    };

}


/*
=========================================================
MODULE EXPORTS
=========================================================
*/

module.exports = {

    // Leagues
    FOOTBALL_LEAGUES,

    // Odds
    getFootballOdds,
    getUpcomingFootballGames,
    getFootballEventOdds,

    // Scores / Results
    getFootballScores,
    getCompletedFootballResults,
    getLiveFootballGames,
    getFootballEventResult,
    checkFootballResult,

    // Event information
    getFootballEventMarkets,

    // Sports discovery
    getSports

};