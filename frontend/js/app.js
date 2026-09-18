// ==========================================
// Twinn Live Studio - Broadcaster Frontend
// ==========================================


// ==========================================
// CAMERA ELEMENTS
// ==========================================

const cameraPreview =
    document.getElementById("cameraPreview");

const cameraPlaceholder =
    document.getElementById("cameraPlaceholder");

const startCameraButton =
    document.getElementById("startCameraButton");

const stopCameraButton =
    document.getElementById("stopCameraButton");

const cameraStatus =
    document.getElementById("cameraStatus");


// ==========================================
// STREAM ELEMENTS
// ==========================================

const streamTitle =
    document.getElementById("streamTitle");

const category =
    document.getElementById("category");

const userId =
    document.getElementById("userId");

const createStreamButton =
    document.getElementById("createStreamButton");

const goLiveButton =
    document.getElementById("goLiveButton");

const stopLiveButton =
    document.getElementById("stopLiveButton");

const streamName =
    document.getElementById("streamName");

const streamId =
    document.getElementById("streamId");

const liveStatus =
    document.getElementById("liveStatus");

const liveMessage =
    document.getElementById("liveMessage");

const connectionStatus =
    document.getElementById("connectionStatus");

const streamConnection =
    document.getElementById("streamConnection");

const streamStatus =
    document.getElementById("streamStatus");

const videoStatus =
    document.getElementById("videoStatus");

const audioStatus =
    document.getElementById("audioStatus");


// ==========================================
// APPLICATION STATE
// ==========================================

let cameraStream = null;
let currentStream = null;
let socket = null;


// ==========================================
// START CAMERA
// ==========================================

async function startCamera() {

    try {

        cameraStream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

        cameraPreview.srcObject = cameraStream;

        cameraPlaceholder.style.display = "none";

        cameraStatus.textContent =
            "Camera On";

        cameraStatus.classList.remove(
            "offline"
        );

        cameraStatus.classList.add(
            "online"
        );

        startCameraButton.disabled = true;
        stopCameraButton.disabled = false;

        console.log(
            "📹 Camera started successfully"
        );

    } catch (error) {

        console.error(
            "❌ Camera error:",
            error
        );

        alert(
            "Unable to access camera/microphone.\n\n" +
            "Please allow camera and microphone permission."
        );
    }
}


// ==========================================
// STOP CAMERA
// ==========================================

function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(track => {
                track.stop();
            });

        cameraStream = null;
    }

    cameraPreview.srcObject = null;

    cameraPlaceholder.style.display =
        "flex";

    cameraStatus.textContent =
        "Camera Off";

    cameraStatus.classList.remove(
        "online"
    );

    cameraStatus.classList.add(
        "offline"
    );

    startCameraButton.disabled = false;
    stopCameraButton.disabled = true;

    console.log(
        "⏹ Camera stopped"
    );
}


// ==========================================
// CREATE STREAM
// ==========================================

async function createStream() {

    const title =
        streamTitle.value.trim();

    const selectedCategory =
        category.value;

    const selectedUserId =
        Number(userId.value);


    if (!title) {

        alert(
            "Please enter a stream title."
        );

        return;
    }


    if (!selectedCategory) {

        alert(
            "Please select a category."
        );

        return;
    }


    if (!selectedUserId) {

        alert(
            "Please enter a valid User ID."
        );

        return;
    }


    try {

        showMessage(
            "Creating stream..."
        );


        const response =
            await fetch(
                "/api/streams",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        title: title,
                        userId: selectedUserId,
                        category: selectedCategory
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to create stream"
            );
        }


        currentStream =
            data.stream;


        streamName.textContent =
            currentStream.title;

        streamId.textContent =
            currentStream.id;


        streamStatus.textContent =
            currentStream.status;

        streamConnection.textContent =
            "Ready";


        goLiveButton.disabled = false;

        stopLiveButton.disabled = true;


        showMessage(
            `Stream #${currentStream.id} created successfully.`
        );


        console.log(
            "✅ Stream created:",
            currentStream
        );

    } catch (error) {

        console.error(
            "❌ Stream creation error:",
            error
        );

        showMessage(
            `Error: ${error.message}`
        );
    }
}


// ==========================================
// GO LIVE
// ==========================================

async function goLive() {

    if (!currentStream) {

        alert(
            "Please create a stream first."
        );

        return;
    }


    try {

        showMessage(
            "Starting live stream..."
        );


        const response =
            await fetch(
                `/api/streams/${currentStream.id}/start`,
                {
                    method: "POST"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to start stream"
            );
        }


        currentStream = {
            ...currentStream,
            ...data.stream
        };


        liveStatus.textContent =
            "STARTING";

        liveStatus.classList.remove(
            "offline"
        );

        liveStatus.classList.add(
            "online"
        );


        streamStatus.textContent =
            currentStream.status;

        streamConnection.textContent =
            "Connecting";


        goLiveButton.disabled = true;

        stopLiveButton.disabled = false;


        showMessage(
            "Live stream is starting..."
        );


        console.log(
            "🔴 Stream starting:",
            currentStream
        );

    } catch (error) {

        console.error(
            "❌ Start stream error:",
            error
        );

        showMessage(
            `Error: ${error.message}`
        );
    }
}


// ==========================================
// STOP LIVE
// ==========================================

async function stopLive() {

    if (!currentStream) {
        return;
    }


    try {

        showMessage(
            "Stopping live stream..."
        );


        const response =
            await fetch(
                `/api/streams/${currentStream.id}/stop`,
                {
                    method: "POST"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to stop stream"
            );
        }


        currentStream = {
            ...currentStream,
            ...data.stream
        };


        liveStatus.textContent =
            "STOPPED";

        liveStatus.classList.remove(
            "online"
        );

        liveStatus.classList.add(
            "offline"
        );


        streamStatus.textContent =
            "stopped";

        streamConnection.textContent =
            "Offline";

        videoStatus.textContent =
            "Not receiving";

        audioStatus.textContent =
            "Not receiving";


        goLiveButton.disabled = false;

        stopLiveButton.disabled = true;


        showMessage(
            "Live stream stopped."
        );


        console.log(
            "⏹ Stream stopped:",
            currentStream
        );

    } catch (error) {

        console.error(
            "❌ Stop stream error:",
            error
        );

        showMessage(
            `Error: ${error.message}`
        );
    }
}


// ==========================================
// WEBSOCKET CONNECTION
// ==========================================

function connectWebSocket() {

    socket =
        new WebSocket(
            "ws://localhost:5000/ws/streams"
        );


    socket.onopen = () => {

        console.log(
            "🔌 WebSocket connected"
        );

        connectionStatus.textContent =
            "● Backend Online";

        connectionStatus.classList.remove(
            "offline"
        );

        connectionStatus.classList.add(
            "online"
        );
    };


    socket.onmessage = event => {

        try {

            const data =
                JSON.parse(event.data);


            if (
                data.type !==
                "stream_status"
            ) {
                return;
            }


            const stream =
                data.stream;


            // Only update the stream
            // currently being controlled
            if (
                !currentStream ||
                stream.id !== currentStream.id
            ) {
                return;
            }


            currentStream = {
                ...currentStream,
                ...stream
            };


            updateStreamUI(
                stream
            );

        } catch (error) {

            console.error(
                "❌ WebSocket message error:",
                error
            );
        }
    };


    socket.onclose = () => {

        console.log(
            "🔌 WebSocket disconnected"
        );

        connectionStatus.textContent =
            "● Backend Offline";

        connectionStatus.classList.remove(
            "online"
        );

        connectionStatus.classList.add(
            "offline"
        );


        setTimeout(
            connectWebSocket,
            3000
        );
    };


    socket.onerror = error => {

        console.error(
            "❌ WebSocket error:",
            error
        );
    };
}


// ==========================================
// UPDATE STREAM UI
// ==========================================

function updateStreamUI(stream) {

    const status =
        stream.status || "unknown";

    const health =
        stream.health || "unknown";

    const details =
        stream.healthDetails || null;


    // Stream status

    streamStatus.textContent =
        status.toUpperCase();


    // Connection / health

    if (health === "healthy") {

        streamConnection.textContent =
            "Healthy";

    } else if (health === "offline") {

        streamConnection.textContent =
            "Offline";

    } else {

        streamConnection.textContent =
            "Checking";
    }


    // Video

    if (details) {

        videoStatus.textContent =
            details.video || "Unknown";

        audioStatus.textContent =
            details.audio || "Unknown";

    } else {

        videoStatus.textContent =
            "Not receiving";

        audioStatus.textContent =
            "Not receiving";
    }


    // LIVE badge

    if (status === "live") {

        liveStatus.textContent =
            "LIVE";

        liveStatus.classList.remove(
            "offline"
        );

        liveStatus.classList.add(
            "online"
        );

        goLiveButton.disabled = true;
        stopLiveButton.disabled = false;


    } else if (status === "starting") {

        liveStatus.textContent =
            "STARTING";

        liveStatus.classList.remove(
            "offline"
        );

        liveStatus.classList.add(
            "online"
        );


    } else if (status === "stopped") {

        liveStatus.textContent =
            "STOPPED";

        liveStatus.classList.remove(
            "online"
        );

        liveStatus.classList.add(
            "offline"
        );

        goLiveButton.disabled = false;
        stopLiveButton.disabled = true;


    } else {

        liveStatus.textContent =
            status.toUpperCase();

        liveStatus.classList.remove(
            "online"
        );

        liveStatus.classList.add(
            "offline"
        );
    }


    console.log(
        "📡 Stream update:",
        stream
    );
}


// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(message) {

    liveMessage.textContent =
        message;

    liveMessage.style.display =
        "block";
}


// ==========================================
// BACKEND CONNECTION TEST
// ==========================================

async function checkBackend() {

    try {

        const response =
            await fetch("/");

        if (!response.ok) {

            throw new Error(
                "Backend unavailable"
            );
        }


        console.log(
            "🟢 Backend API reachable"
        );

    } catch (error) {

        console.error(
            "❌ Backend unavailable"
        );
    }
}


// ==========================================
// BUTTON EVENTS
// ==========================================

startCameraButton.addEventListener(
    "click",
    startCamera
);


stopCameraButton.addEventListener(
    "click",
    stopCamera
);


createStreamButton.addEventListener(
    "click",
    createStream
);


goLiveButton.addEventListener(
    "click",
    goLive
);


stopLiveButton.addEventListener(
    "click",
    stopLive
);


// ==========================================
// INITIALIZATION
// ==========================================

checkBackend();

connectWebSocket();