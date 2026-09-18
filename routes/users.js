const express = require("express");

const router = express.Router();

// Get all users
router.get("/", (req, res) => {
    res.json({
        message: "Users API",
        users: []
    });
});

// Get user by ID
router.get("/:id", (req, res) => {
    res.json({
        message: "User details",
        userId: req.params.id
    });
});

module.exports = router;