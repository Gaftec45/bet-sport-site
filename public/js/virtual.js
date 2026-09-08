/* =========================================================
   VIRTUAL SPORTS
========================================================= */

(() => {
    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    const API_URL = "/api/virtual/events";


    /*
     * These names must match the gameType values
     * returned by your existing SportLogic service.
     */

    const GAME_TYPES = {
        all: {
            name: "Virtual Sports",
            title: "Upcoming Events",
            description:
                "Select an event and choose your odds.",
            icon: "🎯"
        },

        DashingDerby: {
            name: "Horse Racing",
            title: "Dashing Derby",
            description:
                "Select a horse and place your WIN bet.",
            icon: "🏇"
        },

        PlatinumHounds: {
            name: "Greyhounds",
            title: "Platinum Hounds",
            description:
                "Select a greyhound and place your WIN bet.",
            icon: "🐕"
        },

        HarnessRacing: {
            name: "Harness Racing",
            title: "Harness Racing",
            description:
                "Select a runner and place your WIN bet.",
            icon: "🏇"
        },

        MotorRacing: {
            name: "Motor Racing",
            title: "Motor Racing",
            description:
                "Select a driver and place your WIN bet.",
            icon: "🏎️"
        },

        HorseRacingRouletteV2: {
            name: "Horse Racing Roulette",
            title: "Horse Racing Roulette",
            description:
                "Choose a number and place your bet.",
            icon: "🎰"
        },

        SteepleChase: {
            name: "Steeple Chase",
            title: "Steeple Chase Racing",
            description:
                "Select a horse and place your WIN bet.",
            icon: "🏇"
        },

        SpeedSkating: {
            name: "Speed Skating",
            title: "Speed Skating",
            description:
                "Select a skater and place your WIN bet.",
            icon: "⛸️"
        },

        SingleSeaterMotorRacing: {
            name: "SS Motor Racing",
            title: "Single Seater Motor Racing",
            description:
                "Select a driver and place your WIN bet.",
            icon: "🏎️"
        }
    };


    /* =====================================================
       DOM
    ===================================================== */

    const gamesList =
        document.getElementById(
            "virtualGamesList"
        );

    const loading =
        document.getElementById(
            "virtualGamesLoading"
        );

    const errorBox =
        document.getElementById(
            "virtualGamesError"
        );

    const errorMessage =
        document.getElementById(
            "virtualGamesErrorMessage"
        );

    const emptyBox =
        document.getElementById(
            "virtualGamesEmpty"
        );

    const refreshButton =
        document.getElementById(
            "refreshVirtualGames"
        );

    const retryButton =
        document.getElementById(
            "retryVirtualGames"
        );

    const sectionLabel =
        document.getElementById(
            "virtualSectionLabel"
        );

    const sectionTitle =
        document.getElementById(
            "virtualSectionTitle"
        );

    const sectionDescription =
        document.getElementById(
            "virtualSectionDescription"
        );

    const sportTabs =
        document.querySelectorAll(
            ".virtual-sport-tab"
        );


    /* =====================================================
       STATE
    ===================================================== */

    let allGames = [];

    let selectedGameType = "all";

    let loadingRequest = false;


    /* =====================================================
       INITIALIZE
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initializeVirtualPage
    );


    /*
     * In case this script loads after DOMContentLoaded.
     */

    if (
        document.readyState ===
        "interactive" ||
        document.readyState === "complete"
    ) {
        initializeVirtualPage();
    }


    let initialized = false;


    function initializeVirtualPage() {

        if (initialized) {
            return;
        }

        initialized = true;


        if (!gamesList) {
            console.error(
                "Virtual games container not found."
            );

            return;
        }


        setupTabs();

        setupRefresh();

        setupRetry();

        loadVirtualGames();

    }


    /* =====================================================
       TABS
    ===================================================== */

    function setupTabs() {

        sportTabs.forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    const gameType =
                        tab.dataset.gameType ||
                        "all";

                    selectedGameType =
                        gameType;


                    sportTabs.forEach(
                        item => {
                            item.classList.toggle(
                                "active",
                                item === tab
                            );
                        }
                    );


                    updateSectionHeader();

                    renderGames();

                }
            );

        });

    }


    /* =====================================================
       REFRESH
    ===================================================== */

    function setupRefresh() {

        if (!refreshButton) {
            return;
        }


        refreshButton.addEventListener(
            "click",
            () => {

                loadVirtualGames();

            }
        );

    }


    function setupRetry() {

        if (!retryButton) {
            return;
        }


        retryButton.addEventListener(
            "click",
            () => {

                loadVirtualGames();

            }
        );

    }


    /* =====================================================
       LOAD VIRTUAL GAMES
    ===================================================== */

    async function loadVirtualGames() {

        if (loadingRequest) {
            return;
        }


        loadingRequest = true;


        showLoading();


        try {

            /*
             * Your backend should return JSON.
             *
             * Expected general structure:
             *
             * {
             *     success: true,
             *     data: [...]
             * }
             *
             * or:
             *
             * {
             *     success: true,
             *     games: [...]
             * }
             */

            const response =
                await fetch(
                    API_URL,
                    {
                        method: "GET",
                        headers: {
                            "Accept":
                                "application/json"
                        },
                        cache: "no-store"
                    }
                );


            /*
             * Prevent the common:
             *
             * Unexpected token '<'
             *
             * error when the server returns HTML.
             */

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";


            if (
                !contentType.includes(
                    "application/json"
                )
            ) {

                const text =
                    await response.text();

                console.error(
                    "Virtual API returned non-JSON:",
                    text.slice(0, 500)
                );

                throw new Error(
                    "Virtual sports server returned an invalid response."
                );

            }


            const result =
                await response.json();


            if (
                !response.ok ||
                result.success === false
            ) {

                throw new Error(
                    result.message ||
                    "Unable to load virtual games."
                );

            }


            allGames =
                normalizeGames(result);


            hideLoading();


            updateSectionHeader();

            renderGames();


        } catch (error) {

            console.error(
                "Virtual games error:",
                error
            );


            showError(
                error.message ||
                "Unable to load virtual games."
            );

        } finally {

            loadingRequest = false;

        }

    }


    /* =====================================================
       NORMALIZE API RESPONSE
    ===================================================== */

    function normalizeGames(result) {

        /*
         * Support several possible response structures
         * from your backend.
         */

        let games =
            result.data ??
            result.games ??
            result.events ??
            [];


        /*
         * Some APIs return:
         *
         * data: {
         *     games: [...]
         * }
         */

        if (
            games &&
            !Array.isArray(games) &&
            Array.isArray(games.games)
        ) {
            games = games.games;
        }


        if (!Array.isArray(games)) {
            games = [];
        }


        return games
            .map(
                normalizeGame
            )
            .filter(Boolean);

    }


    /* =====================================================
       NORMALIZE GAME
    ===================================================== */

    function normalizeGame(game) {

        if (!game || typeof game !== "object") {
            return null;
        }


        /*
         * SportLogic/provider field names may vary.
         * We normalize them here so the UI doesn't
         * depend on the provider's exact structure.
         */

        const gameType =
            game.gameType ||
            game.game_type ||
            game.type ||
            game.sport ||
            "DashingDerby";


        const eventId =
            game.eventId ||
            game.event_id ||
            game.id ||
            game.eventID;


        if (!eventId) {
            return null;
        }


        const eventName =
            game.eventName ||
            game.event_name ||
            game.name ||
            getGameTypeConfig(gameType).title;


        const runners =
            game.runners ||
            game.participants ||
            game.competitors ||
            game.selections ||
            [];


        return {
            ...game,

            eventId:
                String(eventId),

            gameType:

                gameType,

            eventName,

            runners:
                normalizeRunners(
                    runners
                ),

            status:
                normalizeStatus(game),

            startTime:
                game.startTime ||
                game.start_time ||
                game.scheduledAt ||
                game.scheduled_at ||
                game.start ||
                null,

            cycle:
                game.cycle ||
                game.cycleSeconds ||
                game.cycle_seconds ||
                null
        };

    }


    /* =====================================================
       NORMALIZE RUNNERS
    ===================================================== */

    function normalizeRunners(
        runners
    ) {

        if (!Array.isArray(runners)) {
            return [];
        }


        return runners.map(
            (runner, index) => {

                if (
                    runner === null ||
                    runner === undefined
                ) {
                    return null;
                }


                /*
                 * Some providers may return
                 * simple strings.
                 */

                if (
                    typeof runner ===
                    "string"
                ) {

                    return {
                        runnerId:
                            String(index + 1),

                        number:
                            index + 1,

                        name:
                            runner,

                        odds:
                            null
                    };

                }


                const runnerId =
                    runner.runnerId ||
                    runner.runner_id ||
                    runner.id ||
                    runner.number ||
                    index + 1;


                const number =
                    runner.number ||
                    runner.position ||
                    runner.no ||
                    index + 1;


                const name =
                    runner.name ||
                    runner.runnerName ||
                    runner.runner_name ||
                    runner.participant ||
                    runner.driverName ||
                    runner.driver_name ||
                    `Runner ${number}`;


                const odds =
                    extractOdds(
                        runner
                    );


                return {
                    ...runner,

                    runnerId:
                        String(
                            runnerId
                        ),

                    number,

                    name,

                    odds
                };

            }
        ).filter(Boolean);

    }


    /* =====================================================
       EXTRACT ODDS
    ===================================================== */

    function extractOdds(
        runner
    ) {

        const possibleOdds = [
            runner.odds,
            runner.price,
            runner.odd,
            runner.decimalOdds,
            runner.decimal_odds,
            runner.winOdds,
            runner.win_odds
        ];


        for (
            const value
            of possibleOdds
        ) {

            const number =
                Number(value);


            if (
                Number.isFinite(number) &&
                number >= 1
            ) {
                return number;
            }

        }


        /*
         * Sometimes odds can be nested.
         */

        if (
            runner.markets &&
            Array.isArray(
                runner.markets
            )
        ) {

            for (
                const market
                of runner.markets
            ) {

                const number =
                    Number(
                        market.odds ||
                        market.price
                    );


                if (
                    Number.isFinite(number) &&
                    number >= 1
                ) {
                    return number;
                }

            }

        }


        return null;

    }


    /* =====================================================
       STATUS
    ===================================================== */

    function normalizeStatus(
        game
    ) {

        const status =
            String(
                game.status ||
                game.state ||
                ""
            ).toLowerCase();


        if (
            status.includes("live") ||
            status.includes("running") ||
            status.includes("open")
        ) {
            return "live";
        }


        if (
            status.includes("complete") ||
            status.includes("finished") ||
            status.includes("closed")
        ) {
            return "finished";
        }


        return "upcoming";

    }


    /* =====================================================
       RENDER
    ===================================================== */

    function renderGames() {

        if (!gamesList) {
            return;
        }


        const games =
            getFilteredGames();


        if (games.length === 0) {

            gamesList.innerHTML = "";

            showEmpty();

            return;

        }


        hideEmpty();


        gamesList.innerHTML =
            games.map(
                renderGame
            ).join("");


        /*
         * Important:
         *
         * We use the same `.odd-button` class
         * used by the shared bet-slip.js.
         *
         * Therefore the existing bet slip can
         * detect these buttons automatically.
         */

        attachOddButtonBehavior();

    }


    /* =====================================================
       FILTER
    ===================================================== */

    function getFilteredGames() {

        if (
            selectedGameType ===
            "all"
        ) {

            return allGames;

        }


        return allGames.filter(
            game =>
                String(
                    game.gameType
                ).toLowerCase() ===
                String(
                    selectedGameType
                ).toLowerCase()
        );

    }


    /* =====================================================
       RENDER GAME CARD
    ===================================================== */

    function renderGame(
        game
    ) {

        const config =
            getGameTypeConfig(
                game.gameType
            );


        const runners =
            Array.isArray(
                game.runners
            )
                ? game.runners
                : [];


        const runnerMarkup =
            runners.length > 0
                ? runners
                    .map(
                        runner =>
                            renderRunner(
                                game,
                                runner
                            )
                    )
                    .join("")
                : renderNoRunners();


        const status =
            game.status ||
            "upcoming";


        const statusLabel =
            status === "live"
                ? "LIVE"
                : status === "finished"
                    ? "FINISHED"
                    : "UPCOMING";


        const statusClass =
            status === "live"
                ? "is-live"
                : "";


        const nextRace =
            formatNextRace(
                game
            );


        const cycleText =
            game.cycle
                ? `${game.cycle}s cycle`
                : "Virtual event";


        return `

            <article
                class="virtual-game-card"
                data-event-id="${escapeHtml(
                    game.eventId
                )}"
                data-game-type="${escapeHtml(
                    game.gameType
                )}"
            >

                <div class="virtual-game-header">

                    <div class="virtual-game-title-area">

                        <div class="virtual-game-icon">
                            ${config.icon}
                        </div>

                        <div class="virtual-game-title">

                            <h3>
                                ${escapeHtml(
                                    game.eventName
                                )}
                            </h3>

                            <span>
                                ${escapeHtml(
                                    config.name
                                )}
                            </span>

                        </div>

                    </div>


                    <div class="virtual-game-status">

                        <span
                            class="virtual-status-badge ${statusClass}"
                        >

                            <span
                                class="status-dot"
                            ></span>

                            ${statusLabel}

                        </span>

                        <span
                            class="virtual-next-race"
                        >
                            ${escapeHtml(
                                nextRace
                            )}
                        </span>

                    </div>

                </div>


                <div class="virtual-game-info">

                    <div class="virtual-game-info-left">

                        <div class="virtual-info-item">

                            <span>
                                Event
                            </span>

                            <strong>
                                ${escapeHtml(
                                    game.eventId
                                )}
                            </strong>

                        </div>

                        <div class="virtual-info-item">

                            <span>
                                Runners
                            </span>

                            <strong>
                                ${runners.length}
                            </strong>

                        </div>

                        <div class="virtual-info-item">

                            <span>
                                Cycle
                            </span>

                            <strong>
                                ${escapeHtml(
                                    cycleText
                                )}
                            </strong>

                        </div>

                    </div>


                    <div class="virtual-game-info-right">
                        ${escapeHtml(
                            formatStartTime(
                                game.startTime
                            )
                        )}
                    </div>

                </div>


                <div class="virtual-runners">

                    <div class="virtual-runners-heading">

                        <span>
                            WINNER
                        </span>

                        <small>
                            Select your runner
                        </small>

                    </div>


                    <div class="virtual-runner-list">

                        ${runnerMarkup}

                    </div>

                </div>

            </article>

        `;

    }


    /* =====================================================
       RENDER RUNNER
    ===================================================== */

    function renderRunner(
        game,
        runner
    ) {

        const odds =
            Number(
                runner.odds
            );


        const validOdds =
            Number.isFinite(odds) &&
            odds >= 1;


        const selection =
            runner.name ||
            `Runner ${runner.number}`;


        const meta =
            runner.meta ||
            runner.color ||
            runner.driver ||
            "WIN market";


        return `

            <div
                class="virtual-runner"
            >

                <div
                    class="virtual-runner-number"
                >
                    ${escapeHtml(
                        runner.number
                    )}
                </div>


                <div
                    class="virtual-runner-details"
                >

                    <div
                        class="virtual-runner-name"
                        title="${escapeHtml(
                            selection
                        )}"
                    >
                        ${escapeHtml(
                            selection
                        )}
                    </div>

                    <div
                        class="virtual-runner-meta"
                    >
                        ${escapeHtml(
                            String(meta)
                        )}
                    </div>

                </div>


                <button
                    type="button"
                    class="virtual-odd-button odd-button"
                    ${validOdds
                        ? ""
                        : "disabled"}
                    data-event-id="${escapeHtml(
                        game.eventId
                    )}"
                    data-sport-type="virtual"
                    data-event-name="${escapeHtml(
                        game.eventName
                    )}"
                    data-market="WIN"
                    data-selection="${escapeHtml(
                        selection
                    )}"
                    data-odds="${validOdds
                        ? odds
                        : ""}"
                    data-runner-id="${escapeHtml(
                        runner.runnerId
                    )}"
                >

                    <span>
                        WIN
                    </span>

                    <strong>
                        ${
                            validOdds
                                ? odds.toFixed(2)
                                : "—"
                        }
                    </strong>

                </button>

            </div>

        `;

    }


    /* =====================================================
       NO RUNNERS
    ===================================================== */

    function renderNoRunners() {

        return `

            <div
                style="
                    grid-column: 1 / -1;
                    padding: 25px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 11px;
                    font-weight: 700;
                "
            >
                No betting selections available
                for this event.
            </div>

        `;

    }


    /* =====================================================
       BUTTON BEHAVIOR
    ===================================================== */

    function attachOddButtonBehavior() {

        const buttons =
            gamesList.querySelectorAll(
                ".virtual-odd-button"
            );


        buttons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        /*
                         * bet-slip.js handles the
                         * actual selection.
                         *
                         * This event only updates
                         * the visual selected state.
                         */

                        const eventId =
                            button.dataset.eventId;

                        const market =
                            button.dataset.market ||
                            "WIN";


                        gamesList
                            .querySelectorAll(
                                `.virtual-odd-button[data-event-id="${CSS.escape(
                                    eventId
                                )}"][data-market="${CSS.escape(
                                    market
                                )}"]`
                            )
                            .forEach(
                                item => {

                                    item.classList.remove(
                                        "selected"
                                    );

                                }
                            );


                        button.classList.add(
                            "selected"
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       HEADER
    ===================================================== */

    function updateSectionHeader() {

        const config =
            getGameTypeConfig(
                selectedGameType
            );


        if (sectionLabel) {

            sectionLabel.textContent =
                config.name.toUpperCase();

        }


        if (sectionTitle) {

            sectionTitle.textContent =
                config.title;

        }


        if (sectionDescription) {

            sectionDescription.textContent =
                config.description;

        }

    }


    /* =====================================================
       GAME TYPE CONFIG
    ===================================================== */

    function getGameTypeConfig(
        gameType
    ) {

        return (
            GAME_TYPES[gameType] ||
            GAME_TYPES.all
        );

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function showLoading() {

        if (loading) {
            loading.classList.remove(
                "virtual-hidden"
            );
        }


        if (errorBox) {
            errorBox.classList.add(
                "virtual-hidden"
            );
        }


        if (emptyBox) {
            emptyBox.classList.add(
                "virtual-hidden"
            );
        }


        if (gamesList) {
            gamesList.innerHTML = "";
        }

    }


    function hideLoading() {

        if (loading) {
            loading.classList.add(
                "virtual-hidden"
            );
        }

    }


    /* =====================================================
       EMPTY
    ===================================================== */

    function showEmpty() {

        if (emptyBox) {
            emptyBox.classList.remove(
                "virtual-hidden"
            );
        }

    }


    function hideEmpty() {

        if (emptyBox) {
            emptyBox.classList.add(
                "virtual-hidden"
            );
        }

    }


    /* =====================================================
       ERROR
    ===================================================== */

    function showError(
        message
    ) {

        hideLoading();


        if (emptyBox) {
            emptyBox.classList.add(
                "virtual-hidden"
            );
        }


        if (errorMessage) {

            errorMessage.textContent =
                message;

        }


        if (errorBox) {

            errorBox.classList.remove(
                "virtual-hidden"
            );

        }

    }


    /* =====================================================
       TIME HELPERS
    ===================================================== */

    function formatStartTime(
        value
    ) {

        if (!value) {
            return "Schedule pending";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(value);

        }


        return date.toLocaleTimeString(
            "en-NG",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    function formatNextRace(
        game
    ) {

        if (
            game.status ===
            "live"
        ) {

            return "Running now";

        }


        if (!game.startTime) {
            return "Starting soon";
        }


        const date =
            new Date(
                game.startTime
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "Starting soon";

        }


        const diff =
            date.getTime() -
            Date.now();


        if (diff <= 0) {
            return "Starting now";
        }


        const seconds =
            Math.floor(
                diff / 1000
            );


        if (seconds < 60) {

            return `Starts in ${seconds}s`;

        }


        const minutes =
            Math.floor(
                seconds / 60
            );


        if (minutes < 60) {

            return `Starts in ${minutes}m`;

        }


        const hours =
            Math.floor(
                minutes / 60
            );


        return `Starts in ${hours}h`;

    }


    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function escapeHtml(
        value
    ) {

        return String(
            value ??
            ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }

})();