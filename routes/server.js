const express = require("express");

const app = express();

app.use(express.json());

// Routes
const usersRouter = require("./routes/users");
const streamsRouter = require("./routes/streams");

// API endpoints
app.use("/api/users", usersRouter);
app.use("/api/streams", streamsRouter);

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "TwitCasting Backend API is running"
    });
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});