# Real-Time Live Streaming Platform

A real-time live streaming platform backend inspired by modern live broadcasting systems such as TwitCasting.

The platform provides stream creation, live stream lifecycle management, RTMP ingestion, media server integration, real-time health monitoring, WebSocket-based status updates, and WebRTC playback for viewers.

## Project Architecture

Broadcaster
    ↓
Node.js + Express API
    ↓
FFmpeg
    ↓
RTMP
    ↓
MediaMTX
    ↓
WebRTC / WHEP
    ↓
Viewer

Real-time stream status:
Node.js → WebSocket → Viewer

## Key Features

- User creation and management
- Live stream creation
- Stream start and stop controls
- SQLite database persistence
- FFmpeg streaming integration
- RTMP stream ingestion
- MediaMTX media server integration
- Real-time stream health monitoring
- Video and audio track detection
- WebSocket real-time stream status updates
- WebRTC/WHEP live video playback
- Automatic viewer player reset when a stream ends
- Separate broadcaster and viewer interfaces
- REST API architecture

## Technology Stack

### Backend
- Node.js
- Express.js
- SQLite
- better-sqlite3
- Axios
- WebSocket

### Streaming
- FFmpeg
- RTMP
- MediaMTX
- WebRTC
- WHEP

### Frontend
- HTML
- CSS
- JavaScript
- WebSocket API
- WebRTC API

## Application Flow

### Broadcaster

The broadcaster creates a stream through the Node.js API.

The backend creates a unique media path for the stream and manages its lifecycle.

When the stream starts, FFmpeg sends the media through RTMP to MediaMTX.

### Media Server

MediaMTX receives the RTMP stream and makes the media available for WebRTC playback.

### Health Monitoring

The backend periodically checks MediaMTX to determine whether the stream is online and whether video and audio tracks are being received.

### Real-Time Updates

The backend uses WebSocket to broadcast stream status changes to connected clients.

For example:

- starting
- live
- stopping
- stopped
- offline
- error

### Viewer

The viewer connects to MediaMTX using WebRTC/WHEP.

The viewer receives both video and audio tracks and can watch the live stream in real time.

When the broadcaster stops the stream, the backend sends a WebSocket update and the viewer automatically resets the WebRTC player.

## API Endpoints

### Users

```text
POST /api/users
GET /api/users

Streams
GET /api/streams
GET /api/streams/:id
POST /api/streams
POST /api/streams/:id/start
POST /api/streams/:id/stop
GET /api/streams/:id/health
WebSocket
ws://localhost:5000/ws/streams
Local Setup
1. Install dependencies
npm install
2. Start MediaMTX

Run the MediaMTX server locally.

3. Start the Node.js backend
node server.js

The backend runs at:

http://localhost:5000
Broadcaster
http://localhost:5000/broadcaster/
Viewer
http://localhost:5000/broadcaster/viewer.html
Testing

The streaming pipeline was tested end-to-end:

Stream Creation
      ↓
Stream Start
      ↓
FFmpeg
      ↓
RTMP
      ↓
MediaMTX
      ↓
WebRTC
      ↓
Video + Audio Playback
      ↓
Stream Stop
      ↓
WebSocket Notification
      ↓
Viewer Player Reset
Project Status

Functional MVP completed.

The current implementation demonstrates the core real-time streaming architecture and stream lifecycle management.

Future production enhancements can include:

User authentication
Stream keys
Real browser camera publishing
Viewer count
Live chat
Follow/subscription functionality
PostgreSQL
Cloud deployment
HTTPS/TLS
Horizontal scaling
Advanced monitoring
Automatic stream recovery