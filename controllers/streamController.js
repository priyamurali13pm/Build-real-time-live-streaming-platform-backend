const axios = require("axios");
const { spawn } = require("child_process");

// Get all streams
function getStreams(req, res, streams, db) {
    try {
        const streamsFromDb = db.prepare(`
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

        const result = streamsFromDb.map(dbStream => {
            const runtimeStream = streams.find(
                stream => stream.id === dbStream.id
            );

            return {
                ...dbStream,
                health: runtimeStream?.health || "unknown",
                healthDetails: runtimeStream?.healthDetails || null
            };
        });

        res.json({
            message: "Live Streams API",
            streams: result
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve streams",
            error: error.message
        });
    }
}


// Get stream by ID
function getStreamById(req, res, streams, db) {
    try {
        const streamId = Number(req.params.id);

        const dbStream = db.prepare(`
            SELECT
                id,
                title,
                user_id AS userId,
                category,
                media_path AS mediaPath,
                status,
                created_at
            FROM streams
            WHERE id = ?
        `).get(streamId);

        if (!dbStream) {
            return res.status(404).json({
                message: "Stream not found"
            });
        }

        const runtimeStream = streams.find(
            stream => stream.id === streamId
        );

        const stream = {
            ...dbStream,
            health: runtimeStream?.health || "unknown",
            healthDetails: runtimeStream?.healthDetails || null
        };

        res.json({
            message: "Stream details",
            stream: stream
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve stream",
            error: error.message
        });
    }
}


// Create a new stream
function createStream(req, res, streams, db) {
    try {
        const { title, userId, category } = req.body;

        if (!title || !userId || !category) {
            return res.status(400).json({
                message: "Title, userId and category are required"
            });
        }

        // Make sure the user exists
        const user = db.prepare(`
            SELECT id
            FROM users
            WHERE id = ?
        `).get(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Generate unique MediaMTX path
        const nextStreamId = db.prepare(`
            SELECT COALESCE(MAX(id), 0) + 1 AS nextId
            FROM streams
        `).get().nextId;

        const mediaPath = `stream_${nextStreamId}`;

        // Insert stream into database
        const result = db.prepare(`
            INSERT INTO streams (
                title,
                user_id,
                category,
                media_path,
                status
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            title,
            userId,
            category,
            mediaPath,
            "offline"
        );

        const newStream = {
            id: Number(result.lastInsertRowid),
            title: title,
            userId: userId,
            category: category,
            mediaPath: mediaPath,
            status: "offline",
            health: "unknown",
            healthDetails: null,
            ffmpegProcess: null
        };

        // Keep runtime state in memory
        streams.push(newStream);

        res.status(201).json({
            message: "Live stream created successfully",
            stream: newStream
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create stream",
            error: error.message
        });
    }
}


// Start a stream
function startStream(req, res, streams, db) {
    const streamId = Number(req.params.id);

    const stream = streams.find(
        s => s.id === streamId
    );

    if (!stream) {
        return res.status(404).json({
            message: "Stream not found"
        });
    }

    // Prevent starting the same stream twice
    if (stream.ffmpegProcess) {
        return res.status(400).json({
            message: "Stream is already running"
        });
    }

    const inputFile =
        `${process.env.USERPROFILE}\\Downloads\\myvideo.mp4.mp4`;

    const ffmpegPath =
        "C:\\ffmpeg\\bin\\ffmpeg.exe";

    const outputUrl =
        `rtmp://localhost:1935/${stream.mediaPath}`;

    const ffmpeg = spawn(ffmpegPath, [
        "-re",
        "-stream_loop", "-1",
        "-i", inputFile,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-tune", "zerolatency",
        "-c:a", "aac",
        "-f", "flv",
        outputUrl
    ]);

    stream.ffmpegProcess = ffmpeg;
    stream.status = "starting";
    stream.health = "unknown";

    // Save status to database
    db.prepare(`
        UPDATE streams
        SET status = ?
        WHERE id = ?
    `).run(
        "starting",
        streamId
    );

    ffmpeg.stderr.on("data", data => {
        console.log(
            `FFmpeg Stream ${stream.id}: ${data}`
        );
    });

    ffmpeg.on("error", error => {
        console.error(
            `❌ FFmpeg error for stream ${stream.id}:`,
            error.message
        );

        stream.status = "error";
        stream.health = "unknown";
        stream.ffmpegProcess = null;

        db.prepare(`
            UPDATE streams
            SET status = ?
            WHERE id = ?
        `).run(
            "error",
            streamId
        );
    });

    ffmpeg.on("close", code => {
        console.log(
            `FFmpeg stream ${stream.id} stopped. Code: ${code}`
        );

        stream.ffmpegProcess = null;

        if (stream.status !== "stopped") {
            stream.status = "offline";
            stream.health = "offline";

            db.prepare(`
                UPDATE streams
                SET status = ?
                WHERE id = ?
            `).run(
                "offline",
                streamId
            );
        }
    });

    res.json({
        message: "Stream starting successfully",
        stream: {
            id: stream.id,
            title: stream.title,
            mediaPath: stream.mediaPath,
            status: stream.status
        }
    });
}


// Stop a stream
function stopStream(req, res, streams, db) {
    const streamId = Number(req.params.id);

    const stream = streams.find(
        s => s.id === streamId
    );

    if (!stream) {
        return res.status(404).json({
            message: "Stream not found"
        });
    }

    // Stop FFmpeg if it is running
    if (stream.ffmpegProcess) {
        stream.status = "stopping";

        db.prepare(`
            UPDATE streams
            SET status = ?
            WHERE id = ?
        `).run("stopping", streamId);

        stream.ffmpegProcess.kill("SIGINT");
        stream.ffmpegProcess = null;
    }

    // Final stopped state
    stream.status = "stopped";
    stream.health = "offline";

    stream.healthDetails = {
        video: "not receiving",
        audio: "not receiving",
        tracks: [],
        inboundBytes: 0,
        outboundBytes: 0,
        inboundFramesInError: 0
    };

    // Save stopped state to database
    db.prepare(`
        UPDATE streams
        SET status = ?
        WHERE id = ?
    `).run("stopped", streamId);

    // 🔴 IMPORTANT:
    // Tell all connected WebSocket viewers that
    // this stream has stopped.
    if (
        req.app.locals.broadcastStreamUpdate &&
        typeof req.app.locals.broadcastStreamUpdate === "function"
    ) {
        req.app.locals.broadcastStreamUpdate(stream);
    }

    res.json({
        message: "Live stream stopped successfully",

        stream: {
            id: stream.id,
            title: stream.title,
            mediaPath: stream.mediaPath,
            status: stream.status,
            health: stream.health,
            healthDetails: stream.healthDetails
        }
    });
}


// Get stream health
async function getStreamHealth(req, res, streams, db) {
    const streamId = Number(req.params.id);

    const stream = streams.find(
        s => s.id === streamId
    );

    if (!stream) {
        return res.status(404).json({
            message: "Stream not found"
        });
    }

    try {
        const response = await axios.get(
            "http://localhost:9997/v3/paths/list"
        );

        const paths = response.data.items || [];

        const mediaStream = paths.find(
            path => path.name === stream.mediaPath
        );

        // Stream is offline
        if (!mediaStream || !mediaStream.online) {
            stream.health = "offline";

            db.prepare(`
                UPDATE streams
                SET status = ?
                WHERE id = ?
            `).run(
                "offline",
                streamId
            );

            return res.json({
                message: "Stream health",
                health: {
                    streamId: stream.id,
                    status: "offline",
                    mediaPath: stream.mediaPath,
                    online: false,
                    video: "not receiving",
                    audio: "not receiving"
                }
            });
        }

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

        db.prepare(`
            UPDATE streams
            SET status = ?
            WHERE id = ?
        `).run(
            "live",
            streamId
        );

        return res.json({
            message: "Stream health",
            health: {
                streamId: stream.id,
                status: "healthy",
                mediaPath: stream.mediaPath,
                online: mediaStream.online,
                video: hasVideo
                    ? "receiving"
                    : "not receiving",
                audio: hasAudio
                    ? "receiving"
                    : "not receiving",
                tracks: tracks,
                inboundBytes:
                    mediaStream.inboundBytes,
                outboundBytes:
                    mediaStream.outboundBytes,
                inboundFramesInError:
                    mediaStream.inboundFramesInError
            }
        });

    } catch (error) {
        stream.health = "unknown";

        return res.status(503).json({
            message: "Media server unavailable",
            error: error.message
        });
    }
}


module.exports = {
    getStreams,
    getStreamById,
    createStream,
    startStream,
    stopStream,
    getStreamHealth
};