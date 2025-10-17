# Baby Cam 👶📷

A real-time video streaming application that enables one-to-many video broadcasting using WebRTC technology. **Privacy-focused design ensures your video data never passes through intermediary servers** - all streaming is direct peer-to-peer. Perfect for baby monitoring, remote surveillance, or any scenario where you need to stream live video from one device to multiple viewers while maintaining complete privacy.

## 🌟 Features

- **🔒 Privacy-First Streaming**: Direct peer-to-peer video transmission with no intermediary storage or access
- **Real-time Video Streaming**: Uses WebRTC for low-latency, peer-to-peer video transmission
- **Leader/Viewer Architecture**: One broadcaster (leader) streams to multiple viewers
- **Camera Switching**: Leaders can toggle between front and back cameras on mobile devices
- **Automatic Role Assignment**: First connected client becomes the leader, others become viewers
- **Leader Promotion**: When the leader disconnects, the next viewer is automatically promoted
- **Progressive Web App**: Installable on mobile devices with manifest support
- **Responsive Design**: Works seamlessly on desktop and mobile browsers

## 🚀 Quick Start

### Prerequisites

- Node.js 14.0.0 or higher
- Modern web browser with WebRTC support

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd baby-cam
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:8010`

### Development

For development with auto-restart:
```bash
npm run dev
```

## 🏗️ Architecture

### Backend (Node.js + Express + WebSocket)

- **Express Server**: Serves static files and handles HTTP requests
- **WebSocket Server**: Manages real-time communication between clients
- **Role Management**: Automatically assigns leader/viewer roles and handles promotion

### Frontend (Vanilla JavaScript + WebRTC)

- **App.js**: Main application controller and WebSocket message router
- **Leader.js**: Handles camera access, streaming, and camera switching
- **Viewer.js**: Manages incoming video streams from the leader
- **WebRTC**: Peer-to-peer video transmission with ICE candidate exchange

### Project Structure

```
baby-cam/
├── src/
│   └── index.js          # Main server entry point
├── public/
│   ├── index.html        # Main HTML page
│   ├── manifest.json     # PWA manifest
│   ├── css/
│   │   └── style.css     # Application styles
│   └── js/
│       ├── app.js        # Main app controller
│       ├── leader.js     # Leader (broadcaster) logic
│       └── viewer.js     # Viewer (receiver) logic
├── package.json          # Dependencies and scripts
├── eslint.config.js      # ESLint configuration
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

- `PORT`: Server port (default: 8010)

### WebRTC Configuration

The application uses default STUN servers for NAT traversal. For production use behind firewalls, you may need to configure TURN servers in the `pcConfig` object.

## 📱 Usage

### As a Leader (Broadcaster)

1. Open the application in your browser
2. Grant camera permissions when prompted
3. You'll see "👶 Baby Cam" in the header indicating leader role
4. Use the camera switch button (📷) to toggle between front/back cameras
5. Your video stream will be broadcast to all connected viewers

### As a Viewer

1. Open the application in your browser (while another device is already connected as leader)
2. You'll see "👫 Baby Cam" in the header indicating viewer role
3. You'll automatically receive the video stream from the leader
4. No camera permissions required

## 🛠️ Development

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server
- `npm run lint` - Run ESLint checks
- `npm run lint:fix` - Fix ESLint issues automatically

### Code Quality

The project uses:
- **ESLint**: Code linting with Prettier integration
- **Prettier**: Code formatting
- **Modern ES6+ Syntax**: ES modules, async/await, destructuring

### Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

WebRTC support is required for video streaming functionality.

## 🔒 Privacy & Security

### Privacy Protection
- **No Data Storage**: Video streams are never stored on any server or intermediary
- **Direct P2P Connection**: All video data flows directly between devices using WebRTC
- **No Third-Party Access**: No external services can access or monitor your video streams
- **Local Processing Only**: Video capture and transmission happen entirely on your devices

### Security Considerations
- The application currently runs over HTTP for development
- For production deployment, use HTTPS to ensure WebRTC functionality
- Consider implementing authentication for access control
- Camera permissions are requested only for leader devices

## 🚀 Deployment

### Local Network

The application works out-of-the-box on local networks. All devices on the same network can connect using the server's IP address.

### Production Deployment

1. Ensure HTTPS is configured -- `.pem` certificates
2. Configure appropriate TURN servers for WebRTC
3. Set the `PORT` environment variable
4. Consider using a process manager like PM2

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `npm run lint`
5. Submit a pull request

## 📄 License

ISC License

## 🔍 Technical Details

### Dependencies

**Production:**
- `express` (^5.1.0) - Web server framework
- `ws` (^8.18.3) - WebSocket implementation

**Development:**
- `eslint` (^9.37.0) - JavaScript linting
- `prettier` (^3.6.2) - Code formatting
- Various ESLint plugins for code quality

### WebRTC Flow

1. Leader connects and gains camera access
2. Viewer connects and creates offer
3. Server routes offer to leader (metadata only - no video data)
4. Leader creates answer with video stream
5. ICE candidates are exchanged for NAT traversal
6. **Direct peer-to-peer video connection established - video never touches the server**

### Privacy Architecture

The application uses a **signaling-only server** approach:
- Server only handles connection metadata and signaling messages
- **Zero video data passes through the server**
- All video streams are direct device-to-device connections
- Server acts purely as a "phone book" to help devices find each other
