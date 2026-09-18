let currentStreamId = null;

// Create a new stream
async function createStream() {

    const title = document.getElementById("title").value;
    const userId = Number(document.getElementById("userId").value);
    const category = document.getElementById("category").value;

    if (!title || !userId || !category) {
        alert("Please fill all fields.");
        return;
    }

    try {

        const response = await fetch("/api/streams", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title,
                userId: userId,
                category: category
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        currentStreamId = data.stream.id;

        displayStream(data.stream);

    } catch (error) {

        console.error(error);
        alert("Error creating stream.");

    }
}


// Start the stream
async function startStream() {

    if (!currentStreamId) {
        alert("Please create a stream first.");
        return;
    }

    try {

        const response = await fetch(
            `/api/streams/${currentStreamId}/start`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        displayStream(data.stream);

    } catch (error) {

        console.error(error);
        alert("Error starting stream.");

    }
}


// Stop the stream
async function stopStream() {

    if (!currentStreamId) {
        alert("Please create a stream first.");
        return;
    }

    try {

        const response = await fetch(
            `/api/streams/${currentStreamId}/stop`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        displayStream(data.stream);

    } catch (error) {

        console.error(error);
        alert("Error stopping stream.");

    }
}


// Display stream information
function displayStream(stream) {

    document.getElementById("streamInfo").innerHTML = `
        <p><strong>Stream ID:</strong> ${stream.id}</p>
        <p><strong>Title:</strong> ${stream.title}</p>
        <p><strong>User ID:</strong> ${stream.userId}</p>
        <p><strong>Category:</strong> ${stream.category}</p>
    `;

    updateStatus(stream.status);
}


// Update status on screen
async function updateStatus() {
    if (!currentStreamId) {
        return;
    }

    try {
        const response = await fetch(
            `/api/streams/${currentStreamId}/health`
        );

        const data = await response.json();

        if (!response.ok) {
            document.getElementById("connectionHealth").textContent =
                "🔴 Unavailable";
            return;
        }

        const health = data.health;

        document.getElementById("connectionHealth").textContent =
            health.online ? "🟢 Online" : "🔴 Offline";

        document.getElementById("videoHealth").textContent =
            health.video === "receiving"
                ? "🟢 Receiving"
                : "🔴 Not receiving";

        document.getElementById("audioHealth").textContent =
            health.audio === "receiving"
                ? "🟢 Receiving"
                : "🔴 Not receiving";

        document.getElementById("streamErrors").textContent =
            health.inboundFramesInError ?? 0;

        document.getElementById("lastChecked").textContent =
            new Date().toLocaleTimeString();

    } catch (error) {
        document.getElementById("connectionHealth").textContent =
            "🔴 Backend unavailable";

        console.error("Health check failed:", error);
    }
}

async function loadCurrentStream() {
    try {
        const response = await fetch("/api/streams");
        const data = await response.json();

        if (data.streams && data.streams.length > 0) {
            const stream = data.streams[data.streams.length - 1];

            currentStreamId = stream.id;

            displayStream(stream);
            updateStatus();
        }
    } catch (error) {
        console.error("Failed to load stream:", error);
    }
}

loadCurrentStream();

setInterval(updateStatus, 5000);