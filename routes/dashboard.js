const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Bet = require("../models/Bet");

router.get("/dashboard", async (req, res) => {

    try {

        if (!req.session.userId) {
            return res.redirect("/login");
        }

        const user = await User.findById(req.session.userId);

        if (!user) {
            req.session.destroy(() => {
                res.redirect("/login");
            });
            return;
        }

        // Get user's bets
        const bets = await Bet.find({
            user: user._id
        })
        .sort({ createdAt: -1 });

        // Betting statistics
        const totalBets = bets.length;

        const wonBets = bets.filter(
            bet => bet.status === "won"
        ).length;

        const lostBets = bets.filter(
            bet => bet.status === "lost"
        ).length;

        const winRate = totalBets > 0
            ? Math.round((wonBets / totalBets) * 100)
            : 0;

        // Only show latest 5 bets
        const recentBets = bets.slice(0, 5);

        res.render("dashboard", {
            title: "Dashboard",
            user,
            bets,
            recentBets,
            totalBets,
            wonBets,
            lostBets,
            winRate
        });

    } catch (error) {

        console.error("Dashboard error:", error);

        res.status(500).send("Something went wrong.");

    }

});

module.exports = router;