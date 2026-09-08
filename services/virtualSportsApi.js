require("dotenv").config();

const axios = require("axios");

/*
=========================================================
 BET SPORT — VIRTUAL SPORTS API
 Provider: SportLogic
 Type: Computer-generated virtual racing
=========================================================
*/

const VIRTUAL_API_URL =
    "https://virtuals-api.sportlogic.io/api/v1";


/*
=========================================================
 AXIOS CLIENT
=========================================================
*/

const virtualApi = axios.create({
    baseURL: "https://virtuals-api.sportlogic.io/api/v1",

    timeout: 30000,

    headers: {
        "X-API-Key": process.env.VIRTUAL_API_KEY,
        "Accept": "application/json"
    }
});


async function testVirtualApi() {

    try {

        const response = await virtualApi.get("/game-types");

        console.log("Virtual API connected successfully");

        return response.data;

    } catch (error) {

        console.error("=================================");
        console.error("VIRTUAL API CONNECTION FAILED");
        console.error("=================================");

        console.error("Code:", error.code);
        console.error("Message:", error.message);

        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }

        throw error;
    }
}


/*
=========================================================
 GET GAME TYPES
=========================================================

Returns available virtual games.

Examples:
- Dashing Derby
- Platinum Hounds
- Harness Racing
- Motor Racing
- Horse Racing Roulette
- Steeple Chase
- Speed Skating
- Single Seater Motor Racing
*/

async function getVirtualGameTypes() {

    try {

        const response = await virtualApi.get("/game-types");

        return response.data;

    } catch (error) {

        console.error(
            "Virtual game types error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


/*
=========================================================
 GET GAME TYPE INFO
=========================================================

Returns detailed information about one virtual game.
*/

async function getVirtualGameTypeInfo(gameTypeId) {

    if (!gameTypeId) {
        throw new Error("gameTypeId is required");
    }

    try {

        const response = await virtualApi.get(
            `/game-types/${gameTypeId}/info`
        );

        return response.data;

    } catch (error) {

        console.error(
            "Virtual game type info error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


/*
=========================================================
 GET VIRTUAL EVENTS
=========================================================

status can be:

scheduled
open
closed
started
finished

Example:

getVirtualEvents({
    status: "scheduled",
    perPage: 20
});
*/

async function getVirtualEvents(options = {}) {

    const {
        gameTypeId,
        status = "scheduled",
        perPage = 25,
        cursor
    } = options;


    try {

        const params = {
            status,
            per_page: perPage
        };


        if (gameTypeId) {
            params.game_type_id = gameTypeId;
        }


        if (cursor) {
            params.cursor = cursor;
        }


        const response = await virtualApi.get(
            "/events",
            {
                params
            }
        );


        return response.data;

    } catch (error) {

        console.error(
            "Virtual events error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


/*
=========================================================
 GET UPCOMING VIRTUAL EVENTS
=========================================================

Convenience function for BET LORD frontend.

Returns scheduled virtual games.
*/

async function getUpcomingVirtualGames(options = {}) {

    return getVirtualEvents({
        ...options,
        status: "scheduled"
    });

}


/*
=========================================================
 GET OPEN VIRTUAL EVENTS
=========================================================

Useful when you only want games that can currently
receive selections.
*/

async function getOpenVirtualGames(options = {}) {

    return getVirtualEvents({
        ...options,
        status: "open"
    });

}


/*
=========================================================
 GET A SINGLE VIRTUAL EVENT
=========================================================

Returns:

- event
- runners
- odds
- form
- finish position if finished
*/

async function getVirtualEvent(eventId) {

    if (!eventId) {
        throw new Error("eventId is required");
    }


    try {

        const response = await virtualApi.get(
            `/events/${eventId}`
        );


        return response.data;

    } catch (error) {

        console.error(
            "Virtual event error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


/*
=========================================================
 GET VIRTUAL EVENT RESULTS
=========================================================

Used for settlement.

Returns:

- finishing positions
- winner
- place
- forecast
- tricast
*/

async function getVirtualResults(eventId, options = {}) {

    if (!eventId) {
        throw new Error("eventId is required");
    }


    const {
        drawNumber,
        finishPosition
    } = options;


    try {

        const params = {};


        if (drawNumber) {
            params.draw_number = drawNumber;
        }


        if (finishPosition) {
            params.finish_position = finishPosition;
        }


        const response = await virtualApi.get(
            `/events/${eventId}/results`,
            {
                params
            }
        );


        return response.data;

    } catch (error) {

        console.error(
            "Virtual results error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


/*
=========================================================
 GET MARKETS
=========================================================

Examples:

WIN
PLACE
SHOW
EXACTA
QUINELLA
TRIFECTA
HEAD_TO_HEAD
ODD_EVEN
HIGH_LOW
*/

async function getVirtualMarkets() {

    try {

        const response = await virtualApi.get(
            "/markets"
        );


        return response.data;

    } catch (error) {

        console.error(
            "Virtual markets error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


/*
=========================================================
 GET API USAGE
=========================================================

Useful because the free plan has a daily request limit.
*/

async function getVirtualApiUsage() {

    try {

        const response = await virtualApi.get(
            "/usage"
        );


        return response.data;

    } catch (error) {

        console.error(
            "Virtual API usage error:",
            error.response?.data || error.message
        );

        throw error;
    }
}


/*
=========================================================
 EXPORTS
=========================================================
*/

module.exports = {

    testVirtualApi,

    getVirtualGameTypes,

    getVirtualGameTypeInfo,

    getVirtualEvents,

    getUpcomingVirtualGames,

    getOpenVirtualGames,

    getVirtualEvent,

    getVirtualResults,

    getVirtualMarkets,

    getVirtualApiUsage

};