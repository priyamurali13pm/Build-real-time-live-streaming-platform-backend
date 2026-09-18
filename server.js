const express = require("express");
const axios = require("axios");
const http = require("http");
const { WebSocketServer } = require("ws");
const streamRoutes = require("./routes/streamRoutes");
const db = require("./database");

const app = express();

let users = [];

let streams = [];

// Load saved streams from SQLite when the server starts
const savedStreams = db.prepare(`
    SELECT
        id,
        title,
        user_id AS userId,
        category,
        media_path AS mediaPath,
        status,
        created_at
    FROM streams
    ORDER BY id
`).all();

savedStreams.forEach(stream => {
    streams.push({
        ...stream,
        health: "unknown",
        healthDetails: null,
        ffmpegProcess: null
    });
});

console.log(`📦 Loaded ${streams.length} stream(s) from SQLite`);

app.locals.streams = streams;
app.locals.db = db;


app.use(express.json());
app.use("/api/streams", streamRoutes);
app.use(express.static("public"));
app.use("/broadcaster", express.static("frontend"));

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "TwitCasting Backend API is running"
    });
});

// Users API
// Get all users
app.get("/api/users", (req, res) => {
    try {
        const users = db.prepare(`
            SELECT id, name, email, created_at
            FROM users
            ORDER BY id
        `).all();

        res.json({
            message: "Users API",
            users: users
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve users",
            error: error.message
        });
    }
});

// Get user by ID
app.get("/api/users/:id", (req, res) => {
    try {
        const userId = Number(req.params.id);

        const user = db.prepare(`
            SELECT id, name, email, created_at
            FROM users
            WHERE id = ?
        `).get(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            message: "User details",
            user: user
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve user",
            error: error.message
        });
    }
});

// Create a new user
app.post("/api/users", (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required"
            });
        }

        const result = db.prepare(`
            INSERT INTO users (name, email)
            VALUES (?, ?)
        `).run(name, email);

        const newUser = db.prepare(`
            SELECT id, name, email, created_at
            FROM users
            WHERE id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({
            message: "User created successfully",
            user: newUser
        });

    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        res.status(500).json({
            message: "Failed to create user",
            error: error.message
        });
    }
});

// Live Streams API


// 👇 ADD STEP 3 HERE
// Create a new live stream



// Start a live stream


// Stop a live stream

// Stream Health API

// Automatic Stream Health Monitor
console.log("🔍 Stream health monitor started");

setInterval(async () => {
    console.log(`🔎 Monitoring ${streams.length} stream(s)`);

    for (const stream of streams) {

        // If the user intentionally stopped the stream,
        // keep it as "stopped" instead of changing it to "offline".
        if (stream.status === "stopped") {
            stream.health = "offline";

            stream.healthDetails = {
                video: "not receiving",
                audio: "not receiving",
                tracks: [],
                inboundBytes: 0,
                outboundBytes: 0,
                inboundFramesInError: 0
            };

            console.log(
                `⏹️ Stream ${stream.id} is intentionally stopped`
            );

            continue;
        }

        try {
            const response = await axios.get(
                "http://localhost:9997/v3/paths/list"
            );

            const paths = response.data.items || [];

            const mediaStream = paths.find(
                path => path.name === stream.mediaPath
            );

            // Stream is not receiving media
            if (!mediaStream || !mediaStream.online) {

                const previousStatus = stream.status;

                stream.health = "offline";
                stream.status = "offline";

                stream.healthDetails = {
                    video: "not receiving",
                    audio: "not receiving",
                    tracks: [],
                    inboundBytes: 0,
                    outboundBytes: 0,
                    inboundFramesInError: 0
                };

                // Save offline state to database
                db.prepare(`
                    UPDATE streams
                    SET status = ?
                    WHERE id = ?
                `).run(
                    "offline",
                    stream.id
                );

                console.log(
                    `⚠️ Stream ${stream.id} is offline`
                );

                // Notify WebSocket clients only when status changes
                if (previousStatus !== stream.status) {
                    broadcastStreamUpdate(stream);
                }

            } else {

                const previousStatus = stream.status;

                const tracks = mediaStream.tracks || [];

                const hasVideo = tracks.some(
                    track =>
                        track === "H264" ||
                        track === "H265" ||
                        track === "AV1"
                );

                const hasAudio = tracks.some(
                    track =>
                        track === "MPEG-4 Audio" ||
                        track === "AAC" ||
                        track === "Opus"
                );

                stream.health = "healthy";
                stream.status = "live";

                stream.healthDetails = {
                    video: hasVideo
                        ? "receiving"
                        : "not receiving",

                    audio: hasAudio
                        ? "receiving"
                        : "not receiving",

                    tracks: tracks,

                    inboundBytes:
                        mediaStream.inboundBytes || 0,

                    outboundBytes:
                        mediaStream.outboundBytes || 0,

                    inboundFramesInError:
                        mediaStream.inboundFramesInError || 0
                };

                // Save live state to database
                db.prepare(`
                    UPDATE streams
                    SET status = ?
                    WHERE id = ?
                `).run(
                    "live",
                    stream.id
                );

                console.log(
                    `🟢 Stream ${stream.id} is healthy`
                );

                // Notify WebSocket clients only when status changes
                if (previousStatus !== stream.status) {
                    broadcastStreamUpdate(stream);
                }
            }

        } catch (error) {

            const previousHealth = stream.health;

            stream.health = "unknown";

            console.log(
                `❌ Unable to check stream ${stream.id}`
            );

            if (previousHealth !== stream.health) {
                broadcastStreamUpdate(stream);
            }
        }
    }
}, 5000);
const PORT = 5000;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
    server: server,
    path: "/ws/streams"
});

// WebSocket connection
wss.on("connection", (ws) => {
    console.log("🔌 WebSocket client connected");

    // Confirm WebSocket connection
    ws.send(JSON.stringify({
        type: "connection",
        message: "Connected to TwitCasting WebSocket"
    }));

    // Send current stream status immediately
    streams.forEach(stream => {
        ws.send(JSON.stringify({
            type: "stream_status",

            stream: {
                id: stream.id,
                title: stream.title,
                category: stream.category,
                userId: stream.userId,
                mediaPath: stream.mediaPath,

                status: stream.status,
                health: stream.health || "unknown",
                healthDetails: stream.healthDetails || null,

                updatedAt: new Date().toISOString()
            }
        }));
    });

    ws.on("close", () => {
        console.log("🔌 WebSocket client disconnected");
    });
});

// Broadcast stream updates
function broadcastStreamUpdate(stream) {
    const message = JSON.stringify({
        type: "stream_status",

        stream: {
            id: stream.id,
            title: stream.title,
            category: stream.category,
            userId: stream.userId,
            mediaPath: stream.mediaPath,

            status: stream.status,
            health: stream.health || "unknown",
            healthDetails: stream.healthDetails || null,

            updatedAt: new Date().toISOString()
        }
    });

    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

app.locals.broadcastStreamUpdate = broadcastStreamUpdate;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket running on ws://localhost:${PORT}/ws/streams`);
});

