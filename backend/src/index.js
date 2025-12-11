const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const http = require('http');
const app = require('./app');
const { connectMongo } = require('./db/mongo');
const { syncAllIndexes } = require('./scripts/syncIndexes');
const { setupChatSocket } = require('./services/chatSocket');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  try {
    if (process.env.MONGODB_URI) {
      await connectMongo(process.env.MONGODB_URI);
      console.log('MongoDB connected');
      // Auto-sync Mongoose indexes at startup so index changes are applied automatically
      await syncAllIndexes();
    } else {
      console.warn('MONGODB_URI not set. Starting server without DB connection.');
    }
    const server = http.createServer(app);
    // Attach Socket.IO for real-time chat
    setupChatSocket(server);
    server.listen(PORT, HOST, () => {
      console.log(`Hospital API listening at http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

start();
