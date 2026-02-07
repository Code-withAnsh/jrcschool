/**
 * JRC School Backend Server
 * Express.js API server for school website
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');

// Import routes
const admissionRoutes = require('./routes/admission');
const contactRoutes = require('./routes/contact');
const aiRoutes = require('./routes/ai');
const feeRoutes = require('./routes/fee');
const newsRoutes = require('./routes/news');
const studentAuthRoutes = require('./routes/studentAuth');
const studentRoutes = require('./routes/student');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5500',
      'http://localhost:3000',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:3000'
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow for now, restrict in production
    }
  },
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (if serving frontend from backend)
// app.use(express.static(path.join(__dirname, '../pdfs/LKG')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'JRC School API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/admissions', admissionRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/student', studentAuthRoutes);
app.use('/api/student', studentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jrc-school')
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  console.log('⚠️  Starting server without database connection...');
  
  // Start server anyway (for development)
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} (without database)`);
  });
});

module.exports = app;
