console.log("BetSports local development started.");

document.addEventListener("DOMContentLoaded", () => {
    loadFootballOdds();
});


async function loadFootballOdds() {
    const liveContainer = document.getElementById("live-games-list");
    const upcomingContainer = document.getElementById("upcoming-games-list");

    console.log("🏈 Loading football odds...");

    try {
        const response = await fetch("/api/football/odds");

        console.log("Football API status:", response.status);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();

        console.log("Football API response:", result);

        if (!result.success) {
            throw new Error(result.message || "Unable to load odds");
        }

        const games = Array.isArray(result.data)
            ? result.data
            : [];

        console.log("Football games received:", games.length);
        console.log("Games:", games);

        if (games.length === 0) {
            if (upcomingContainer) {
                upcomingContainer.innerHTML = `
                    <div class="game-card">
                        <div class="game-info">
                            <span>No upcoming games available.</span>
                        </div>
                    </div>
                `;
            }

            if (liveContainer) {
                liveContainer.innerHTML = `
                    <div class="game-card">
                        <div class="game-info">
                            <span>No live games available.</span>
                        </div>
                    </div>
                `;
            }

            return;
        }

        renderGames(
            games,
            liveContainer,
            upcomingContainer
        );

    } catch (error) {
        console.error("❌ Odds loading error:", error);

        if (liveContainer) {
            liveContainer.innerHTML = `
                <div class="game-card">
                    <div class="game-info">
                        <span>Unable to load live games.</span>
                    </div>
                </div>
            `;
        }

        if (upcomingContainer) {
            upcomingContainer.innerHTML = `
                <div class="game-card">
                    <div class="game-info">
                        <span>Unable to load upcoming games.</span>
                    </div>
                </div>
            `;
        }
    }
}

function renderGames(games, liveContainer, upcomingContainer) {

    const now = new Date();

    const liveGames = [];
    const upcomingGames = [];

    games.forEach(game => {

        const startTime = new Date(game.commence_time);

        if (startTime <= now) {
            liveGames.push(game);
        } else {
            upcomingGames.push(game);
        }

    });


    // LIVE GAMES

    if (liveContainer) {

        if (liveGames.length === 0) {

            liveContainer.innerHTML = `
                <div class="game-card">
                    <div class="game-info">
                        <span>No live games available right now.</span>
                    </div>
                </div>
            `;

        } else {

            liveContainer.innerHTML = liveGames
                .map(game => createLiveGameCard(game))
                .join("");
        }
    }


    // UPCOMING GAMES

    if (upcomingContainer) {

        if (upcomingGames.length === 0) {

            upcomingContainer.innerHTML = `
                <div class="game-card">
                    <div class="game-info">
                        <span>No upcoming games available.</span>
                    </div>
                </div>
            `;

        } else {

            upcomingContainer.innerHTML = upcomingGames
                .map(game => createUpcomingGameCard(game))
                .join("");
        }
    }
}


function createLiveGameCard(game) {

    const odds = getBestOdds(game);

    return `
        <div class="game-card">

            <div class="game-info">

                <span class="live-dot">
                    ● LIVE
                </span>

                <h3>${escapeHtml(game.home_team)}</h3>

                <span>vs</span>

                <h3>${escapeHtml(game.away_team)}</h3>

            </div>

            <div class="odds">

                ${createOddButton(
                    game,
                    game.home_team,
                    odds.home
                )}

                ${createOddButton(
                    game,
                    "Draw",
                    odds.draw
                )}

                ${createOddButton(
                    game,
                    game.away_team,
                    odds.away
                )}

            </div>

        </div>
    `;
}


function createUpcomingGameCard(game) {

    const odds = getBestOdds(game);

    const date = new Date(game.commence_time);

    const formattedDate = date.toLocaleString([], {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });

    return `
        <div class="game-card">

            <div class="game-date">
                ${formattedDate}
            </div>

            <div class="game-teams">

                <strong>
                    ${escapeHtml(game.home_team)}
                </strong>

                <span>
                    VS
                </span>

                <strong>
                    ${escapeHtml(game.away_team)}
                </strong>

            </div>

            <div class="odds">

                ${createOddButton(
                    game,
                    game.home_team,
                    odds.home
                )}

                ${createOddButton(
                    game,
                    "Draw",
                    odds.draw
                )}

                ${createOddButton(
                    game,
                    game.away_team,
                    odds.away
                )}

            </div>

        </div>
    `;
}


function createOddButton(game, selection, price) {

    if (!price) {
        return `
            <button disabled>
                ${escapeHtml(selection)}
                <strong>-</strong>
            </button>
        `;
    }

    return `
        <button
            class="odd-button"
            data-event-id="${escapeHtml(game.id)}"
            data-home-team="${escapeHtml(game.home_team)}"
            data-away-team="${escapeHtml(game.away_team)}"
            data-selection="${escapeHtml(selection)}"
            data-odds="${price}"
        >

            ${escapeHtml(selection)}

            <strong>
                ${price.toFixed(2)}
            </strong>

        </button>
    `;
}


function getBestOdds(game) {

    const best = {
        home: null,
        draw: null,
        away: null
    };

    if (!game.bookmakers) {
        return best;
    }

    game.bookmakers.forEach(bookmaker => {

        bookmaker.markets?.forEach(market => {

            if (market.key !== "h2h") {
                return;
            }

            market.outcomes?.forEach(outcome => {

                const price = Number(outcome.price);

                if (!price) {
                    return;
                }

                if (outcome.name === game.home_team) {

                    if (!best.home || price > best.home) {
                        best.home = price;
                    }

                } else if (outcome.name === game.away_team) {

                    if (!best.away || price > best.away) {
                        best.away = price;
                    }

                } else if (
                    outcome.name.toLowerCase() === "draw"
                ) {

                    if (!best.draw || price > best.draw) {
                        best.draw = price;
                    }
                }

            });

        });

    });

    return best;
}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =============================
// FOOTBALL LEAGUE SELECTOR
// =============================

const leagueTabs = document.querySelectorAll(".league-tab");

leagueTabs.forEach(tab => {

    tab.addEventListener("click", async () => {

        leagueTabs.forEach(item => {
            item.classList.remove("active");
        });

        tab.classList.add("active");

        const league = tab.dataset.league;

        await loadFootballLeague(league);

    });

});


async function loadFootballLeague(league) {

    const liveContainer =
        document.getElementById("live-games-list");

    const upcomingContainer =
        document.getElementById("upcoming-games-list");


    if (liveContainer) {

        liveContainer.innerHTML = `
            <div class="game-card loading-card">
                <div class="game-info">
                    <span>Loading ${league} games...</span>
                </div>
            </div>
        `;

    }


    if (upcomingContainer) {

        upcomingContainer.innerHTML = `
            <div class="game-card loading-card">
                <div class="game-info">
                    <span>Loading ${league} games...</span>
                </div>
            </div>
        `;

    }


    try {

        const response = await fetch(
            `/api/odds/football?league=${league}`
        );


        if (!response.ok) {
            throw new Error("Failed to load league");
        }


        const result = await response.json();


        if (!result.success) {
            throw new Error(result.message);
        }


        renderGames(
            result.data,
            liveContainer,
            upcomingContainer
        );


    } catch (error) {

        console.error("League loading error:", error);


        if (liveContainer) {

            liveContainer.innerHTML = `
                <div class="game-card">
                    <div class="game-info">
                        <span>
                            Unable to load games.
                        </span>
                    </div>
                </div>
            `;

        }


        if (upcomingContainer) {

            upcomingContainer.innerHTML = `
                <div class="game-card">
                    <div class="game-info">
                        <span>
                            Unable to load games.
                        </span>
                    </div>
                </div>
            `;

        }

    }

}

// =============================
// BET SLIP
// =============================

let betSelections = [];

const betSelectionsContainer =
    document.getElementById("bet-selections");

const emptyBetSlip =
    document.getElementById("empty-bet-slip");

const stakeInput =
    document.getElementById("stake-input");

const totalOddsElement =
    document.getElementById("total-odds");

const potentialWinElement =
    document.getElementById("potential-win");

const clearBetsButton =
    document.getElementById("clear-bets");

const placeBetButton =
    document.getElementById("place-bet-btn");


// Listen for odds clicks

document.addEventListener("click", (event) => {

    const button =
        event.target.closest(".odd-button");

    if (!button) {
        return;
    }

const eventId =
    button.dataset.eventId;

const homeTeam =
    button.dataset.homeTeam;

const awayTeam =
    button.dataset.awayTeam;

const selection =
    button.dataset.selection;

const odds =
    Number(button.dataset.odds);


    // Check if this match already exists

    const existingIndex =
        betSelections.findIndex(
            bet => bet.eventId === eventId
        );


        const bet = {
            eventId,
            homeTeam,
            awayTeam,
            selection,
            odds
        };


    if (existingIndex !== -1) {

        // Replace the existing selection

        betSelections[existingIndex] = bet;

    } else {

        betSelections.push(bet);

    }


    renderBetSlip();

});


function renderBetSlip() {

    if (!betSelectionsContainer) {
        return;
    }


    if (betSelections.length === 0) {

        betSelectionsContainer.innerHTML = "";

        if (emptyBetSlip) {
            emptyBetSlip.style.display = "block";
        }

        updateBetSummary();

        return;
    }


    if (emptyBetSlip) {
        emptyBetSlip.style.display = "none";
    }


    betSelectionsContainer.innerHTML =
        betSelections.map((bet, index) => {

            return `
                <div class="bet-selection">

                    <div class="bet-selection-top">

                        <div class="bet-selection-teams">
                            ${escapeHtml(bet.homeTeam)}
                            vs
                            ${escapeHtml(bet.awayTeam)}
                        </div>

                        <button
                            type="button"
                            class="remove-selection"
                            data-remove-index="${index}"
                        >
                            ×
                        </button>

                    </div>

                    <div class="bet-selection-market">
                        Match Winner
                    </div>

                    <span class="bet-selection-odd">
                        Odds ${bet.odds.toFixed(2)}
                    </span>

                </div>
            `;

        }).join("");


    updateBetSummary();

}


// Remove selection

document.addEventListener("click", (event) => {

    const removeButton =
        event.target.closest(
            ".remove-selection"
        );

    if (!removeButton) {
        return;
    }


    const index =
        Number(
            removeButton.dataset.removeIndex
        );


    betSelections.splice(index, 1);

    renderBetSlip();

});


// Clear everything

if (clearBetsButton) {

    clearBetsButton.addEventListener(
        "click",
        () => {

            betSelections = [];

            if (stakeInput) {
                stakeInput.value = "";
            }

            renderBetSlip();

        }
    );

}


// Stake changes

if (stakeInput) {

    stakeInput.addEventListener(
        "input",
        updateBetSummary
    );

}


// Calculate totals

function updateBetSummary() {

    let totalOdds = 1;


    betSelections.forEach(bet => {

        totalOdds *= bet.odds;

    });


    if (betSelections.length === 0) {
        totalOdds = 0;
    }


    const stake =
        Number(stakeInput?.value || 0);


    const potentialWin =
        stake * totalOdds;


    if (totalOddsElement) {

        totalOddsElement.textContent =
            totalOdds > 0
                ? totalOdds.toFixed(2)
                : "0.00";

    }


    if (potentialWinElement) {

        potentialWinElement.textContent =
            `₦${potentialWin.toLocaleString(
                "en-NG",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )}`;

    }

}


// Place bet

if (placeBetButton) {

    placeBetButton.addEventListener(
        "click",
        async () => {

            if (betSelections.length === 0) {

                alert("Please select at least one bet.");

                return;
            }


            const stake =
                Number(stakeInput?.value || 0);


            if (!stake || stake <= 0) {

                alert("Please enter your stake.");

                stakeInput?.focus();

                return;
            }


            const totalOdds =
                betSelections.reduce(
                    (total, bet) =>
                        total * bet.odds,
                    1
                );


            const potentialWin =
                stake * totalOdds;


            placeBetButton.disabled = true;

            placeBetButton.textContent =
                "Placing Bet...";


            try {

                const response = await fetch(
                    "/api/bets",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            selections:
                                betSelections,

                            stake,

                            totalOdds,

                            potentialWin

                        })
                    }
                );


                const result =
                    await response.json();


                if (!response.ok || !result.success) {

                    throw new Error(
                        result.message ||
                        "Unable to place bet."
                    );

                }


                alert(
                    `Bet placed successfully!\n\n` +
                    `Total Odds: ${totalOdds.toFixed(2)}\n` +
                    `Stake: ₦${stake.toLocaleString()}\n` +
                    `Potential Win: ₦${potentialWin.toLocaleString()}\n\n` +
                    `Remaining Balance: ₦${result.balance.toLocaleString()}`
                );


                // Clear bet slip

                betSelections = [];

                stakeInput.value = "";

                renderBetSlip();


                // Reload page so navbar balance updates

                setTimeout(() => {
                    window.location.reload();
                }, 500);


            } catch (error) {

                console.error(
                    "Place bet error:",
                    error
                );

                alert(error.message);

            } finally {

                placeBetButton.disabled = false;

                placeBetButton.textContent =
                    "Place Bet";

            }

        }
    );

}