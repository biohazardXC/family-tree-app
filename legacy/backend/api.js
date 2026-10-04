// backend/api.js - Vercel serverless function entry point
const app = require('./server.js');

// Export the Express app as a serverless function
module.exports = app;