const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// Register page
router.get("/register", (req, res) => {
  res.render("register", {
    title: "Create Account",
    error: null,
  });
});

// Register user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.render("register", {
        title: "Create Account",
        error: "Please fill in all fields.",
      });
    }

    if (password !== confirmPassword) {
      return res.render("register", {
        title: "Create Account",
        error: "Passwords do not match.",
      });
    }

    if (password.length < 6) {
      return res.render("register", {
        title: "Create Account",
        error: "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.render("register", {
        title: "Create Account",
        error: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      balance: 10000,
    });

    req.session.userId = user._id;

    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);

    res.render("register", {
      title: "Create Account",
      error: "Something went wrong. Please try again.",
    });
  }
});

// LOGIN PAGE
router.get("/login", (req, res) => {
    res.render("login", {
        title: "Login",
        error: null
    });
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.render("login", {
                title: "Login",
                error: "Invalid email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.render("login", {
                title: "Login",
                error: "Invalid email or password."
            });
        }

        // Create session
        req.session.userId = user._id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;

        res.redirect("/dashboard");

    } catch (error) {
        console.error("Login error:", error);

        res.render("login", {
            title: "Login",
            error: "Something went wrong. Please try again."
        });
    }
});

// LOGOUT
router.get("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error("Logout error:", error);
            return res.redirect("/");
        }

        res.redirect("/");
    });
});

module.exports = router;