const express = require("express");

const {
    getStreams,
    getStreamById,
    createStream,
    startStream,
    stopStream,
    getStreamHealth
} = require("../controllers/streamController");

const router = express.Router();


// Get all streams
router.get("/", (req, res) => {
    getStreams(
        req,
        res,
        req.app.locals.streams,
        req.app.locals.db
    );
});


// Get stream by ID
router.get("/:id", (req, res) => {
    getStreamById(
        req,
        res,
        req.app.locals.streams,
        req.app.locals.db
    );
});


// Create a new stream
router.post("/", (req, res) => {
    createStream(
        req,
        res,
        req.app.locals.streams,
        req.app.locals.db
    );
});


// Start a stream
router.post("/:id/start", (req, res) => {
    startStream(
        req,
        res,
        req.app.locals.streams,
        req.app.locals.db
    );
});


// Stop a stream
router.post("/:id/stop", (req, res) => {
    stopStream(
        req,
        res,
        req.app.locals.streams,
        req.app.locals.db
    );
});


// Get stream health
router.get("/:id/health", (req, res) => {
    getStreamHealth(
        req,
        res,
        req.app.locals.streams,
        req.app.locals.db
    );
});


module.exports = router;