const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Import models
const User = require('./models/User');
const CleanupRequest = require('./models/CleanupRequest');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS  
    }
  });
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Health check - FIRST
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// ===== AUTH ROUTES =====
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, deviceInfo } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name: fullName,
      email,
      password: hashedPassword,
      deviceInfo: deviceInfo || 'Unknown Device',
      location: 'Ghana' 
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: user.profile,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Please contact support.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const userResponse = {
      ...user.profile,
      fullName: user.name 
    };

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ===== CLEANUP REQUEST ROUTES =====

// Statistics route FIRST (before parameterized routes)
app.get('/api/cleanup-requests/stats/summary', async (req, res) => {
  try {
    const totalRequests = await CleanupRequest.countDocuments();
    const pendingRequests = await CleanupRequest.countDocuments({ status: 'pending' });
    const inProgressRequests = await CleanupRequest.countDocuments({ status: 'in-progress' });
    const completedRequests = await CleanupRequest.countDocuments({ status: 'completed' });
    
    const completionRate = totalRequests > 0 
      ? Math.round((completedRequests / totalRequests) * 100) 
      : 0;

    res.json({
      total: totalRequests,
      pending: pendingRequests,
      'in-progress': inProgressRequests,
      completed: completedRequests,
      completionRate
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

// Recent requests route
app.get('/api/cleanup-requests/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const recentRequests = await CleanupRequest.find()
      .sort({ submittedAt: -1 })
      .limit(limit)
      .select('problemType problemLabel location severity status submittedAt contactInfo');

    res.json(recentRequests);
  } catch (error) {
    console.error('Recent requests error:', error);
    res.status(500).json({ message: 'Server error fetching recent requests' });
  }
});

// Submit new cleanup request
app.post('/api/cleanup-requests', async (req, res) => {
  try {
    const {
      problemType,
      location,
      severity,
      description,
      contactInfo,
      photos,
      otherDetails,
      coordinates,
      deviceInfo
    } = req.body;

    // Basic validation
    if (!problemType) {
      return res.status(400).json({ message: 'Problem type is required' });
    }
    if (!severity) {
      return res.status(400).json({ message: 'Severity is required' });
    }
    if (!description?.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (!contactInfo?.phone?.trim()) {
      return res.status(400).json({ message: 'Contact phone is required' });
    }

    // Location validation
    const requestLocation = problemType === 'other' 
      ? otherDetails?.specificLocation 
      : location;
      
    if (!requestLocation?.trim()) {
      return res.status(400).json({ message: 'Location is required' });
    }

    const cleanupRequest = new CleanupRequest({
      problemType,
      location: requestLocation.trim(),
      severity,
      description: description.trim(),
      contactInfo: {
        name: contactInfo.name?.trim() || 'Anonymous',
        phone: contactInfo.phone.trim(),
        email: contactInfo.email?.trim() || ''
      },
      photos: photos || [],
      otherDetails: otherDetails || {},
      coordinates: coordinates || {},
      deviceInfo: deviceInfo || ''
    });

    await cleanupRequest.save();

    res.status(201).json({
      message: 'Cleanup request submitted successfully',
      request: cleanupRequest,
      id: cleanupRequest._id
    });

  } catch (error) {
    console.error('Submit cleanup request error:', error);
    res.status(500).json({ message: 'Server error submitting cleanup request' });
  }
});

// Get all cleanup requests
app.get('/api/cleanup-requests', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      status,
      severity 
    } = req.query;

    const filters = {};
    if (status && status !== 'all') filters.status = status;
    if (severity && severity !== 'all') filters.severity = severity;

    const requests = await CleanupRequest.find(filters)
      .sort({ submittedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await CleanupRequest.countDocuments(filters);

    res.json({
      requests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRequests: total
      }
    });
  } catch (error) {
    console.error('Get cleanup requests error:', error);
    res.status(500).json({ message: 'Server error fetching cleanup requests' });
  }
});

// Get single cleanup request - AFTER static routes
app.get('/api/cleanup-requests/:id', async (req, res) => {
  try {
    const request = await CleanupRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Cleanup request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Get cleanup request error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Cleanup request not found' });
    }
    res.status(500).json({ message: 'Server error fetching cleanup request' });
  }
});

// Update request status
app.patch('/api/cleanup-requests/:id/status', async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (status === 'completed') updateData.actualCompletion = new Date();

    const request = await CleanupRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: 'Cleanup request not found' });
    }

    res.json({
      message: 'Status updated successfully',
      request
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

// ===== USER ROUTES =====
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -resetPasswordToken').sort({ registeredAt: -1 });
    res.json(users.map(user => user.profile));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

app.get('/api/stats/users', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    
    res.json({
      totalUsers,
      activeUsers
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error fetching user statistics' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler - FIXED: Removed the problematic '*' pattern
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available routes:');
  console.log('  GET    /api/health');
  console.log('  POST   /api/auth/register');
  console.log('  POST   /api/auth/login');
  console.log('  POST   /api/cleanup-requests');
  console.log('  GET    /api/cleanup-requests');
  console.log('  GET    /api/cleanup-requests/recent');
  console.log('  GET    /api/cleanup-requests/stats/summary');
});