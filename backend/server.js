const express = require('express');
// Note: @tensorflow/tfjs-node removed to avoid version conflicts with face-api.js
// face-api.js uses its own bundled TensorFlow.js v1.7.0
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const reportsRoutes = require('./routes/reports.routes');
const chatRoutes = require('./routes/chat.routes');
const { router: nlpRoutes } = require('./routes/nlp.routes');
const { loadModels } = require('./services/faceExtractionService');

const app = express();
const server = http.createServer(app);

// Setup Socket.io dengan CORS - Allow semua origin untuk mobile app
const io = new Server(server, {
  cors: {
    origin: "*", // Allow semua origin untuk mobile app
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["authorization"]
  }
});

// Middleware - CORS dengan konfigurasi lebih lengkap
// Allow semua origin untuk mobile app (Flutter)
app.use(cors({
  origin: "*", // Allow semua origin untuk mobile app
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Content-Range"]
}));

// Increase body parser limit untuk support image upload (base64 bisa besar)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.userId} (${socket.userRole})`);
  
  // Join room untuk report updates
  socket.on('subscribe:report', (reportId) => {
    socket.join(`report:${reportId}`);
    console.log(`[Socket] User ${socket.userId} subscribed to report:${reportId}`);
  });
  
  socket.on('unsubscribe:report', (reportId) => {
    socket.leave(`report:${reportId}`);
    console.log(`[Socket] User ${socket.userId} unsubscribed from report:${reportId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.userId}`);
  });
});

// Export io untuk digunakan di routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/nlp', nlpRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LaporIn API is running' });
});

// Load face recognition models saat startup (non-blocking)
loadModels().catch(err => {
  console.warn('[Server] Face recognition models not loaded (optional):', err.message);
  console.warn('[Server] Face registration via photo upload will not work until models are available.');
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Listen di semua interface untuk akses dari device fisik
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.io ready for real-time updates`);
  // Get local IP address for mobile app access
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== 'localhost') break;
  }
  console.log(`📱 Mobile app dapat mengakses: http://${localIP}:${PORT}/api`);
});

