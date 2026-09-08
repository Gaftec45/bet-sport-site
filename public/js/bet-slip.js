/* =========================================================
   SHARED BET SLIP
   Supports REAL + VIRTUAL SPORTS
========================================================= */

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


/* =========================================================
   LISTEN FOR ODDS CLICKS
========================================================= */

document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                ".odd-button"
            );


        if (!button) {
            return;
        }


        if (button.disabled) {
            return;
        }


        /* =================================================
           READ DATA
        ================================================= */

        const eventId =
            button.dataset.eventId;


        const sportType =
            button.dataset.sportType ||
            "real";


        const homeTeam =
            button.dataset.homeTeam ||
            "";


        const awayTeam =
            button.dataset.awayTeam ||
            "";


        const eventName =
            button.dataset.eventName ||
            "";


        const market =
            button.dataset.market ||
            "h2h";


        const selection =
            button.dataset.selection;


        const odds =
            Number(
                button.dataset.odds
            );


        const line =
            button.dataset.line !== undefined &&
            button.dataset.line !== ""
                ? Number(
                    button.dataset.line
                )
                : null;


        const runnerId =
            button.dataset.runnerId ||
            null;


        const drawNumber =
            button.dataset.drawNumber !== undefined &&
            button.dataset.drawNumber !== ""
                ? Number(
                    button.dataset.drawNumber
                )
                : null;


        /* =================================================
           VALIDATE
        ================================================= */

        if (!eventId) {

            console.error(
                "Bet selection is missing eventId."
            );

            return;

        }


        if (!selection) {

            console.error(
                "Bet selection is missing selection."
            );

            return;

        }


        if (
            !Number.isFinite(odds) ||
            odds < 1
        ) {

            console.error(
                "Invalid odds:",
                odds
            );

            return;

        }


        /* =================================================
           SELECTION OBJECT
        ================================================= */

        const bet = {

            eventId,

            sportType,

            homeTeam,

            awayTeam,

            eventName,

            market,

            selection,

            odds,

            line,

            runnerId,

            drawNumber

        };


        /* =================================================
           SAME EVENT + SAME MARKET
           
           Example:
           
           Football:
           Arsenal vs Chelsea
           H2H → Arsenal
           
           Clicking Chelsea should replace Arsenal.
           
           But another market such as:
           
           Arsenal vs Chelsea
           Over 2.5
           
           can coexist.
        ================================================= */

        const existingIndex =
            betSelections.findIndex(
                existingBet =>
                    existingBet.eventId ===
                        eventId &&
                    existingBet.market ===
                        market
            );


        if (
            existingIndex !== -1
        ) {

            /*
             * Replace the existing selection
             * for this event + market.
             */

            betSelections[
                existingIndex
            ] = bet;

        } else {

            betSelections.push(
                bet
            );

        }


        /* =================================================
           VISUAL STATE
        ================================================= */

        updateSelectedOddButtons();


        renderBetSlip();


        /*
         * Open the shared drawer automatically
         * when a selection is added.
         */

        if (
            typeof openBetSlipWhenSelectionAdded ===
            "function"
        ) {

            openBetSlipWhenSelectionAdded();

        } else if (
            typeof openBetSlip ===
            "function"
        ) {

            openBetSlip();

        }

    }
);


/* =========================================================
   RENDER BET SLIP
========================================================= */

function renderBetSlip() {

    if (!betSelectionsContainer) {
        return;
    }


    /* =====================================================
       EMPTY
    ===================================================== */

    if (
        betSelections.length ===
        0
    ) {

        betSelectionsContainer.innerHTML =
            "";


        if (emptyBetSlip) {

            emptyBetSlip.style.display =
                "block";

        }


        updateBetSummary();

        updateBetSlipCount();

        updateSelectedOddButtons();

        return;

    }


    /* =====================================================
       SHOW SELECTIONS
    ===================================================== */

    if (emptyBetSlip) {

        emptyBetSlip.style.display =
            "none";

    }


    betSelectionsContainer.innerHTML =
        betSelections
            .map(
                (
                    bet,
                    index
                ) => {

                    return renderBetSelection(
                        bet,
                        index
                    );

                }
            )
            .join("");


    updateBetSummary();

    updateBetSlipCount();

    updateSelectedOddButtons();

}


/* =========================================================
   RENDER SINGLE SELECTION
========================================================= */

function renderBetSelection(
    bet,
    index
) {

    const isVirtual =
        bet.sportType ===
        "virtual";


    let eventTitle;


    if (isVirtual) {

        eventTitle =
            bet.eventName ||
            "Virtual Event";

    } else {

        eventTitle =
            `${bet.homeTeam} vs ${bet.awayTeam}`;

    }


    const marketName =
        getMarketDisplayName(
            bet.market,
            bet.line
        );


    return `

        <div
            class="bet-selection"
            data-selection-index="${index}"
        >

            <div class="bet-selection-top">

                <div class="bet-selection-teams">

                    ${escapeHtml(
                        eventTitle
                    )}

                </div>


                <button
                    type="button"
                    class="remove-selection"
                    data-remove-index="${index}"
                    aria-label="Remove selection"
                >
                    ×
                </button>

            </div>


            <div class="bet-selection-market">

                ${escapeHtml(
                    marketName
                )}

                ${
                    isVirtual
                        ? `
                            <span
                                style="
                                    margin-left:5px;
                                    color:#16a34a;
                                    font-size:9px;
                                    font-weight:800;
                                "
                            >
                                VIRTUAL
                            </span>
                        `
                        : ""
                }

            </div>


            <div
                style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:10px;
                    margin-top:7px;
                "
            >

                <span
                    style="
                        min-width:0;
                        overflow:hidden;
                        color:#475569;
                        font-size:11px;
                        font-weight:800;
                        text-overflow:ellipsis;
                        white-space:nowrap;
                    "
                    title="${escapeHtml(
                        bet.selection
                    )}"
                >
                    ${escapeHtml(
                        bet.selection
                    )}
                </span>


                <span
                    class="bet-selection-odd"
                >
                    ${bet.odds.toFixed(2)}
                </span>

            </div>

        </div>

    `;

}


/* =========================================================
   MARKET DISPLAY NAME
========================================================= */

function getMarketDisplayName(
    market,
    line
) {

    const normalized =
        String(
            market ||
            "h2h"
        ).toLowerCase();


    switch (
        normalized
    ) {

        case "h2h":
        case "moneyline":
        case "match_winner":
        case "match-winner":
            return "Match Winner";


        case "totals":
        case "total":
            return line !== null
                ? `Total ${line}`
                : "Total Goals";


        case "btts":
            return "Both Teams To Score";


        case "win":
            return "Winner";


        case "place":
            return "Place";


        default:
            return String(
                market ||
                "Bet"
            );

    }

}


/* =========================================================
   REMOVE SELECTION
========================================================= */

document.addEventListener(
    "click",
    (event) => {

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


        if (
            !Number.isInteger(
                index
            )
        ) {
            return;
        }


        if (
            index < 0 ||
            index >= betSelections.length
        ) {
            return;
        }


        betSelections.splice(
            index,
            1
        );


        renderBetSlip();

    }
);


/* =========================================================
   CLEAR EVERYTHING
========================================================= */

if (clearBetsButton) {

    clearBetsButton.addEventListener(
        "click",
        () => {

            betSelections = [];


            if (stakeInput) {

                stakeInput.value =
                    "";

            }


            renderBetSlip();

        }
    );

}


/* =========================================================
   STAKE CHANGES
========================================================= */

if (stakeInput) {

    stakeInput.addEventListener(
        "input",
        updateBetSummary
    );

}


/* =========================================================
   CALCULATE SUMMARY
========================================================= */

function updateBetSummary() {

    let totalOdds =
        1;


    betSelections.forEach(
        bet => {

            totalOdds *=
                Number(
                    bet.odds
                );

        }
    );


    if (
        betSelections.length ===
        0
    ) {

        totalOdds =
            0;

    }


    const stake =
        Number(
            stakeInput?.value ||
            0
        );


    const potentialWin =
        stake *
        totalOdds;


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
                    minimumFractionDigits:
                        2,

                    maximumFractionDigits:
                        2
                }
            )}`;

    }

}


/* =========================================================
   UPDATE SELECTED ODDS
========================================================= */

function updateSelectedOddButtons() {

    /*
     * Remove selected state from every
     * odds button first.
     */

    document
        .querySelectorAll(
            ".odd-button"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "selected"
                );

            }
        );


    /*
     * Re-apply selected state to
     * currently selected bets.
     */

    betSelections.forEach(
        bet => {

            const buttons =
                document.querySelectorAll(
                    ".odd-button"
                );


            buttons.forEach(
                button => {

                    const sameEvent =
                        button.dataset.eventId ===
                        bet.eventId;


                    const sameMarket =
                        (
                            button.dataset.market ||
                            "h2h"
                        ) ===
                        bet.market;


                    const sameSelection =
                        button.dataset.selection ===
                        bet.selection;


                    if (
                        sameEvent &&
                        sameMarket &&
                        sameSelection
                    ) {

                        button.classList.add(
                            "selected"
                        );

                    }

                }
            );

        }
    );

}


/* =========================================================
   BET SLIP COUNT
========================================================= */

function updateBetSlipCount() {

    const countElement =
        document.getElementById(
            "bet-slip-count"
        );


    if (countElement) {

        countElement.textContent =
            betSelections.length;

    }


    const selectedText =
        document.getElementById(
            "bet-slip-selected-text"
        );


    if (!selectedText) {
        return;
    }


    if (
        betSelections.length ===
        0
    ) {

        selectedText.textContent =
            "No games selected";

        return;

    }


    selectedText.textContent =
        betSelections.length ===
        1
            ? "1 selection"
            : `${betSelections.length} selections`;

}


/* =========================================================
   PLACE BET
========================================================= */

if (placeBetButton) {

    placeBetButton.addEventListener(
        "click",
        async () => {

            if (
                betSelections.length ===
                0
            ) {

                alert(
                    "Please select at least one bet."
                );

                return;

            }


            const stake =
                Number(
                    stakeInput?.value ||
                    0
                );


            if (
                !Number.isFinite(
                    stake
                ) ||
                stake <= 0
            ) {

                alert(
                    "Please enter your stake."
                );


                stakeInput?.focus();


                return;

            }


            /* =============================================
               CALCULATE ODDS ON CLIENT
               
               Backend MUST calculate again.
               ============================================= */

            const totalOdds =
                betSelections.reduce(
                    (
                        total,
                        bet
                    ) =>
                        total *
                        Number(
                            bet.odds
                        ),
                    1
                );


            const potentialWin =
                stake *
                totalOdds;


            placeBetButton.disabled =
                true;


            placeBetButton.textContent =
                "Placing Bet...";


            try {

                const response =
                    await fetch(
                        "/api/bets",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Accept":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    {
                                        selections:
                                            betSelections,

                                        stake,

                                        totalOdds,

                                        potentialWin
                                    }
                                )
                        }
                    );


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
                        "Bet API returned non-JSON:",
                        text.slice(
                            0,
                            500
                        )
                    );


                    throw new Error(
                        "The server returned an invalid response."
                    );

                }


                const result =
                    await response.json();


                if (
                    !response.ok ||
                    !result.success
                ) {

                    throw new Error(
                        result.message ||
                        "Unable to place bet."
                    );

                }


                const balance =
                    Number(
                        result.balance ||
                        0
                    );


                alert(
                    `Bet placed successfully!\n\n` +

                    `Selections: ${
                        betSelections.length
                    }\n` +

                    `Total Odds: ${
                        totalOdds.toFixed(2)
                    }\n` +

                    `Stake: ₦${
                        stake.toLocaleString(
                            "en-NG"
                        )
                    }\n` +

                    `Potential Win: ₦${
                        potentialWin.toLocaleString(
                            "en-NG"
                        )
                    }\n\n` +

                    `Remaining Balance: ₦${
                        balance.toLocaleString(
                            "en-NG"
                        )
                    }`
                );


                /* =========================================
                   CLEAR BET SLIP
                ========================================= */

                betSelections =
                    [];


                if (stakeInput) {

                    stakeInput.value =
                        "";

                }


                renderBetSlip();


                /*
                 * Give the navbar time to update.
                 */

                setTimeout(
                    () => {

                        window.location.reload();

                    },
                    500
                );


            } catch (error) {

                console.error(
                    "Place bet error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to place bet."
                );

            } finally {

                placeBetButton.disabled =
                    false;


                placeBetButton.textContent =
                    "Place Bet";

            }

        }
    );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

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


/* =========================================================
   INITIAL RENDER
========================================================= */

renderBetSlip();