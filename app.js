require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));

app.use(
    "/api/paystack/webhook",
    express.raw({
        type: "application/json"
    })
);

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "local-development-secret",
        resave: false,
        saveUninitialized: false
    })
);

// Make login status available to all EJS pages
app.use(async (req, res, next) => {
    res.locals.isLoggedIn = !!req.session.userId;
    res.locals.currentUser = null;

    if (req.session.userId) {
        try {
            const User = require("./models/User");

            const user = await User.findById(req.session.userId)
                .select("name email balance");

            if (user) {
                res.locals.currentUser = user;
            }
        } catch (error) {
            console.error("User session error:", error.message);
        }
    }

    next();
});

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB error:", error.message);
  });



const { runSettlementWorker } = require("./services/settlementWorker");


/*
    Run immediately when server starts,
    then every 60 seconds.
*/

runSettlementWorker();


setInterval(
    () => {

        runSettlementWorker();

    },
    60 * 1000
);



// Routes
app.use("/", require("./routes/index"));
app.use("/", require("./routes/auth"));
app.use("/", require("./routes/dashboard"));
app.use("/", require("./routes/odds"));
app.use("/", require("./routes/virtualSports"));
app.use("/", require("./routes/bets"));
app.use("/", require("./routes/admin"));

// Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});