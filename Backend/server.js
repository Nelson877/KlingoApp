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
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
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

// Statistics route - MUST BE BEFORE :id routes
app.get('/api/cleanup-requests/stats', async (req, res) => {
  try {
    const stats = await CleanupRequest.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching statistics',
      error: error.message 
    });
  }
});

// Recent requests route
app.get('/api/cleanup-requests/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const recentRequests = await CleanupRequest.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('problemType problemLabel location severity status createdAt contactInfo');

    res.json({
      success: true,
      data: recentRequests
    });
  } catch (error) {
    console.error('Recent requests error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching recent requests',
      error: error.message 
    });
  }
});

// Submit new cleanup request
app.post('/api/cleanup-requests', async (req, res) => {
  try {
    console.log('Received cleanup request submission:', req.body);

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

    // Validation with detailed error messages
    const validationErrors = [];

    if (!problemType) {
      validationErrors.push('Problem type is required');
    }
    if (!severity) {
      validationErrors.push('Severity is required');
    }
    if (!description || !description.trim()) {
      validationErrors.push('Description is required');
    }
    if (!contactInfo || !contactInfo.phone || !contactInfo.phone.trim()) {
      validationErrors.push('Contact phone is required');
    }

    // Location validation
    const requestLocation = problemType === 'other' 
      ? otherDetails?.specificLocation 
      : location;
      
    if (!requestLocation || !requestLocation.trim()) {
      validationErrors.push('Location is required');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors 
      });
    }

    // Create cleanup request
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
      otherDetails: problemType === 'other' ? otherDetails : {},
      coordinates: coordinates || {},
      deviceInfo: deviceInfo || ''
    });

    const savedRequest = await cleanupRequest.save();

    console.log('Cleanup request saved successfully:', savedRequest._id);

    res.status(201).json({
      success: true,
      message: 'Cleanup request submitted successfully',
      data: savedRequest,
      id: savedRequest._id
    });

  } catch (error) {
    console.error('Submit cleanup request error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Server error submitting cleanup request',
      error: error.message 
    });
  }
});

// Get all cleanup requests with filters
app.get('/api/cleanup-requests', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      status,
      severity,
      problemType
    } = req.query;

    console.log('Fetching cleanup requests with filters:', { status, severity, problemType });

    const filters = {};
    if (status && status !== 'all') filters.status = status;
    if (severity && severity !== 'all') filters.severity = severity;
    if (problemType && problemType !== 'all') filters.problemType = problemType;

    const requests = await CleanupRequest.find(filters)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await CleanupRequest.countDocuments(filters);

    console.log(`Found ${requests.length} requests (total: ${total})`);

    res.json({
      success: true,
      data: requests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRequests: total
      }
    });
  } catch (error) {
    console.error('Get cleanup requests error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching cleanup requests',
      error: error.message 
    });
  }
});

// Get single cleanup request by ID
app.get('/api/cleanup-requests/:id', async (req, res) => {
  try {
    const request = await CleanupRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: 'Cleanup request not found' 
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Get cleanup request error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ 
        success: false,
        message: 'Cleanup request not found' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching cleanup request',
      error: error.message 
    });
  }
});

// Update request status
app.patch('/api/cleanup-requests/:id/status', async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status' 
      });
    }

    const request = await CleanupRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: 'Cleanup request not found' 
      });
    }

    // Use the model's updateStatus method
    await request.updateStatus(status, adminNotes);

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: request
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating status',
      error: error.message 
    });
  }
});

// Assign request
app.patch('/api/cleanup-requests/:id/assign', async (req, res) => {
  try {
    const { assignedTo, estimatedCompletion } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ 
        success: false,
        message: 'Assignee is required' 
      });
    }

    const request = await CleanupRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: 'Cleanup request not found' 
      });
    }

    // Use the model's assignTo method
    await request.assignTo(assignedTo, estimatedCompletion);

    res.json({
      success: true,
      message: 'Request assigned successfully',
      data: request
    });

  } catch (error) {
    console.error('Assign request error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error assigning request',
      error: error.message 
    });
  }
});

// Delete request
app.delete('/api/cleanup-requests/:id', async (req, res) => {
  try {
    const request = await CleanupRequest.findByIdAndDelete(req.params.id);

    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: 'Cleanup request not found' 
      });
    }

    res.json({
      success: true,
      message: 'Cleanup request deleted successfully',
      data: { id: req.params.id }
    });

  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error deleting request',
      error: error.message 
    });
  }
});

// ===== USER ROUTES =====

// Get current user profile (authenticated)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -resetPasswordToken');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user.profile
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching user profile',
      error: error.message 
    });
  }
});

// Update user profile (authenticated - own profile)
app.patch('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, location } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (location !== undefined) updateData.location = location.trim();

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating profile',
      error: error.message 
    });
  }
});

// Change password (authenticated)
app.post('/api/users/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'New password must be at least 8 characters long' 
      });
    }

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false,
        message: 'Current password is incorrect' 
      });
    }

    // Hash and save new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error changing password',
      error: error.message 
    });
  }
});

// Get all users (admin)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -resetPasswordToken').sort({ registeredAt: -1 });
    res.json({
      success: true,
      data: users.map(user => user.profile)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching users',
      error: error.message 
    });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password -resetPasswordToken');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user.profile
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching user',
      error: error.message 
    });
  }
});

app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status' 
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password -resetPasswordToken');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: user.profile
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating user status',
      error: error.message 
    });
  }
});

// Update user by ID (admin)
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { name, phone, location } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (location !== undefined) updateData.location = location.trim();

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user.profile
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error updating user',
      error: error.message 
    });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error deleting user',
      error: error.message 
    });
  }
});

app.get('/api/stats/users', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    
    // Get users from last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({ 
      registeredAt: { $gte: weekAgo } 
    });
    
    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        verifiedUsers,
        newUsersThisWeek
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching user statistics',
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    error: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.path 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log('\n📡 Available routes:');
  console.log('  GET    /api/health');
  console.log('\n👤 Auth:');
  console.log('  POST   /api/auth/register');
  console.log('  POST   /api/auth/login');
  console.log('  GET    /api/auth/me (protected)');
  console.log('\n🧹 Cleanup Requests:');
  console.log('  POST   /api/cleanup-requests');
  console.log('  GET    /api/cleanup-requests');
  console.log('  GET    /api/cleanup-requests/:id');
  console.log('  GET    /api/cleanup-requests/stats');
  console.log('  GET    /api/cleanup-requests/recent');
  console.log('  PATCH  /api/cleanup-requests/:id/status');
  console.log('  PATCH  /api/cleanup-requests/:id/assign');
  console.log('  DELETE /api/cleanup-requests/:id');
  console.log('\n👥 Users:');
  console.log('  GET    /api/users');
  console.log('  GET    /api/users/:id');
  console.log('  PATCH  /api/users/:id');
  console.log('  PATCH  /api/users/:id/status');
  console.log('  PATCH  /api/users/profile (protected)');
  console.log('  POST   /api/users/change-password (protected)');
  console.log('  DELETE /api/users/:id');
  console.log('  GET    /api/stats/users\n');
});