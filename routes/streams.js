const express = require("express");

const router = express.Router();

// Get all live streams
router.get("/", (req, res) => {
    res.json({
        message: "Live Streams API",
        streams: []
    });
});

// Get stream by ID
router.get("/:id", (req, res) => {
    res.json({
        message: "Stream details",
        streamId: req.params.id
    });
});

module.exports = router;