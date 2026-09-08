/* =========================================================
   REAL SPORTS — FOOTBALL
   Uses the shared /js/bet-slip.js
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const leagueTabs =
        document.querySelectorAll(".league-tab");

    const leagueTitle =
        document.getElementById("leagueTitle");

    const matchesList =
        document.getElementById("matchesList");

    const matchesLoading =
        document.getElementById("matchesLoading");

    const matchesError =
        document.getElementById("matchesError");

    const matchesErrorMessage =
        document.getElementById(
            "matchesErrorMessage"
        );

    const matchesEmpty =
        document.getElementById(
            "matchesEmpty"
        );

    const refreshMatches =
        document.getElementById(
            "refreshMatches"
        );

    const retryMatches =
        document.getElementById(
            "retryMatches"
        );


    /* =====================================================
       LEAGUE NAMES
    ===================================================== */

    const leagueNames = {

        epl:
            "Premier League",

        laliga:
            "La Liga",

        bundesliga:
            "Bundesliga",

        seriea:
            "Serie A",

        ligue1:
            "Ligue 1",

        champions:
            "Champions League"

    };


    /* =====================================================
       CURRENT LEAGUE
    ===================================================== */

    let currentLeague =
        "epl";


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHtml(value) {

        return String(
            value ?? ""
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


    /* =====================================================
       FORMAT MATCH DATE
    ===================================================== */

    function formatMatchDate(
        dateString
    ) {

        if (!dateString) {

            return "Date unavailable";

        }


        const date =
            new Date(
                dateString
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "Date unavailable";

        }


        return date.toLocaleString(
            "en-NG",
            {
                weekday:
                    "short",

                day:
                    "numeric",

                month:
                    "short",

                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        );

    }


    /* =====================================================
       SHOW LOADING
    ===================================================== */

    function showLoading() {

        if (matchesLoading) {

            matchesLoading.classList.remove(
                "hidden"
            );

        }


        if (matchesError) {

            matchesError.classList.add(
                "hidden"
            );

        }


        if (matchesEmpty) {

            matchesEmpty.classList.add(
                "hidden"
            );

        }


        if (matchesList) {

            matchesList.innerHTML =
                "";

        }

    }


    /* =====================================================
       HIDE LOADING
    ===================================================== */

    function hideLoading() {

        if (matchesLoading) {

            matchesLoading.classList.add(
                "hidden"
            );

        }

    }


    /* =====================================================
       SHOW ERROR
    ===================================================== */

    function showError(
        message
    ) {

        hideLoading();


        if (matchesList) {

            matchesList.innerHTML =
                "";

        }


        if (matchesEmpty) {

            matchesEmpty.classList.add(
                "hidden"
            );

        }


        if (matchesErrorMessage) {

            matchesErrorMessage.textContent =
                message ||
                "Please try again.";

        }


        if (matchesError) {

            matchesError.classList.remove(
                "hidden"
            );

        }

    }


    /* =====================================================
       SHOW EMPTY
    ===================================================== */

    function showEmpty() {

        hideLoading();


        if (matchesError) {

            matchesError.classList.add(
                "hidden"
            );

        }


        if (matchesEmpty) {

            matchesEmpty.classList.remove(
                "hidden"
            );

        }


        if (matchesList) {

            matchesList.innerHTML =
                "";

        }

    }


    /* =====================================================
       HIDE EMPTY
    ===================================================== */

    function hideEmpty() {

        if (matchesEmpty) {

            matchesEmpty.classList.add(
                "hidden"
            );

        }

    }


    /* =====================================================
       GET BEST H2H ODDS
    ===================================================== */

    function getBestH2HOdds(
        game
    ) {

        const oddsMap =
            new Map();


        if (
            !Array.isArray(
                game.bookmakers
            )
        ) {

            return oddsMap;

        }


        for (
            const bookmaker
            of game.bookmakers
        ) {

            if (
                !Array.isArray(
                    bookmaker.markets
                )
            ) {

                continue;

            }


            const market =
                bookmaker.markets.find(
                    item =>
                        item.key ===
                        "h2h"
                );


            if (
                !market ||
                !Array.isArray(
                    market.outcomes
                )
            ) {

                continue;

            }


            for (
                const outcome
                of market.outcomes
            ) {

                const name =
                    outcome.name;


                const price =
                    Number(
                        outcome.price
                    );


                if (
                    !name ||
                    !Number.isFinite(
                        price
                    ) ||
                    price < 1
                ) {

                    continue;

                }


                const existing =
                    oddsMap.get(
                        name
                    );


                /*
                 * Keep the highest price
                 * from all bookmakers.
                 */

                if (
                    !existing ||
                    price >
                    existing.price
                ) {

                    oddsMap.set(
                        name,
                        {
                            name,
                            price
                        }
                    );

                }

            }

        }


        return oddsMap;

    }


    /* =====================================================
       FIND ODDS
    ===================================================== */

    function getOutcomeOdds(
        oddsMap,
        name
    ) {

        if (
            !oddsMap ||
            !oddsMap.has(name)
        ) {

            return null;

        }


        const outcome =
            oddsMap.get(
                name
            );


        const price =
            Number(
                outcome?.price
            );


        if (
            !Number.isFinite(
                price
            ) ||
            price < 1
        ) {

            return null;

        }


        return price;

    }


    /* =====================================================
       RENDER ODDS BUTTON
    ===================================================== */

    function renderOddButton(
        game,
        selection,
        odds,
        label
    ) {

        if (
            !Number.isFinite(
                odds
            ) ||
            odds < 1
        ) {

            return `

                <div
                    class="odd-button unavailable"
                >

                    <span>
                        ${escapeHtml(
                            label
                        )}
                    </span>

                    <strong>
                        —
                    </strong>

                </div>

            `;

        }


        return `

            <button
                type="button"
                class="odd-button"

                data-event-id="${escapeHtml(
                    game.id
                )}"

                data-sport-type="real"

                data-home-team="${escapeHtml(
                    game.home_team
                )}"

                data-away-team="${escapeHtml(
                    game.away_team
                )}"

                data-event-name="${escapeHtml(
                    `${game.home_team} vs ${game.away_team}`
                )}"

                data-market="h2h"

                data-selection="${escapeHtml(
                    selection
                )}"

                data-odds="${odds}"

                title="Add ${escapeHtml(
                    selection
                )} @ ${odds.toFixed(2)}"
            >

                <span>
                    ${escapeHtml(
                        label
                    )}
                </span>

                <strong>
                    ${odds.toFixed(2)}
                </strong>

            </button>

        `;

    }


    /* =====================================================
       RENDER MATCH
    ===================================================== */

    function renderMatch(
        game
    ) {

        const homeTeam =
            game.home_team ||
            "Home Team";


        const awayTeam =
            game.away_team ||
            "Away Team";


        const oddsMap =
            getBestH2HOdds(
                game
            );


        const homeOdds =
            getOutcomeOdds(
                oddsMap,
                homeTeam
            );


        const drawOdds =
            getOutcomeOdds(
                oddsMap,
                "Draw"
            );


        const awayOdds =
            getOutcomeOdds(
                oddsMap,
                awayTeam
            );


        return `

            <article
                class="match-card"
                data-event-id="${escapeHtml(
                    game.id
                )}"
            >

                <!-- =====================================
                     MATCH HEADER
                ====================================== -->

                <div
                    class="match-card-header"
                >

                    <div
                        class="match-league"
                    >

                        <span>
                            ${escapeHtml(
                                leagueNames[
                                    currentLeague
                                ] ||
                                "Football"
                            )}
                        </span>

                    </div>


                    <div
                        class="match-date"
                    >

                        ${escapeHtml(
                            formatMatchDate(
                                game.commence_time
                            )
                        )}

                    </div>

                </div>


                <!-- =====================================
                     TEAMS
                ====================================== -->

                <div
                    class="match-teams"
                >

                    <div
                        class="team"
                    >

                        <span
                            class="team-name"
                        >
                            ${escapeHtml(
                                homeTeam
                            )}
                        </span>

                    </div>


                    <div
                        class="match-vs"
                    >

                        <span>
                            VS
                        </span>

                    </div>


                    <div
                        class="team"
                    >

                        <span
                            class="team-name"
                        >
                            ${escapeHtml(
                                awayTeam
                            )}
                        </span>

                    </div>

                </div>


                <!-- =====================================
                     ODDS
                ====================================== -->

                <div
                    class="match-odds"
                >

                    <div
                        class="odds-heading"
                    >

                        <span>
                            Match Winner
                        </span>

                        <span>
                            Best Odds
                        </span>

                    </div>


                    <div
                        class="odds-grid"
                    >

                        ${renderOddButton(
                            game,
                            homeTeam,
                            homeOdds,
                            homeTeam
                        )}


                        ${renderOddButton(
                            game,
                            "Draw",
                            drawOdds,
                            "Draw"
                        )}


                        ${renderOddButton(
                            game,
                            awayTeam,
                            awayOdds,
                            awayTeam
                        )}

                    </div>

                </div>

            </article>

        `;

    }


    /* =====================================================
       LOAD MATCHES
    ===================================================== */

    async function loadMatches(
        league =
            currentLeague
    ) {

        currentLeague =
            league;


        showLoading();


        if (leagueTitle) {

            leagueTitle.textContent =
                leagueNames[
                    league
                ] ||
                "Football";

        }


        try {

            const response =
                await fetch(
                    `/api/football/odds?league=${encodeURIComponent(
                        league
                    )}`,
                    {
                        method:
                            "GET",

                        headers: {
                            "Accept":
                                "application/json"
                        },

                        cache:
                            "no-store"
                    }
                );


            /*
             * Prevent the:
             *
             * Unexpected token '<'
             *
             * error if Express sends HTML.
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
                    "Football API returned non-JSON:",
                    text.slice(
                        0,
                        500
                    )
                );


                throw new Error(
                    "The football server returned an invalid response."
                );

            }


            const result =
                await response.json();


            if (
                !response.ok ||
                result.success !== true
            ) {

                throw new Error(
                    result.message ||
                    "Unable to load matches."
                );

            }


            const games =
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : [];


            hideLoading();


            if (
                games.length ===
                0
            ) {

                showEmpty();

                return;

            }


            hideEmpty();


            if (matchesError) {

                matchesError.classList.add(
                    "hidden"
                );

            }


            if (matchesList) {

                matchesList.innerHTML =
                    games
                        .map(
                            game =>
                                renderMatch(
                                    game
                                )
                        )
                        .join("");

            }


            /*
             * Restore selected state for
             * selections that are already
             * inside the shared bet slip.
             */

            if (
                typeof updateSelectedOddButtons ===
                "function"
            ) {

                updateSelectedOddButtons();

            }


        } catch (error) {

            console.error(
                "Load football matches error:",
                error
            );


            showError(
                error.message ||
                "Unable to load matches."
            );

        }

    }


    /* =====================================================
       LEAGUE TAB CLICK
    ===================================================== */

    leagueTabs.forEach(
        tab => {

            tab.addEventListener(
                "click",
                () => {

                    const league =
                        tab.dataset.league;


                    if (!league) {

                        return;

                    }


                    leagueTabs.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    tab.classList.add(
                        "active"
                    );


                    loadMatches(
                        league
                    );

                }
            );

        }
    );


    /* =====================================================
       REFRESH
    ===================================================== */

    if (refreshMatches) {

        refreshMatches.addEventListener(
            "click",
            () => {

                loadMatches(
                    currentLeague
                );

            }
        );

    }


    /* =====================================================
       RETRY
    ===================================================== */

    if (retryMatches) {

        retryMatches.addEventListener(
            "click",
            () => {

                loadMatches(
                    currentLeague
                );

            }
        );

    }


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    loadMatches(
        currentLeague
    );

});