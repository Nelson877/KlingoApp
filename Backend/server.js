const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  // Removed deprecated options
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

// User Schema - Enhanced with password reset fields
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: 'Not specified'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  deviceInfo: {
    type: String,
    default: ''
  },
  requestsCount: {
    type: Number,
    default: 0
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  // Password reset fields
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// NEW: Cleanup Request Schema
const cleanupRequestSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for anonymous requests
  },
  problemType: {
    type: String,
    required: true,
    enum: ['litter', 'dumping', 'graffiti', 'overgrown', 'spill', 'other']
  },
  problemLabel: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high']
  },
  description: {
    type: String,
    required: true
  },
  contactInfo: {
    name: {
      type: String,
      default: 'Anonymous'
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      default: ''
    }
  },
  photos: [{
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // For "other" type requests
  otherDetails: {
    customProblemType: {
      type: String,
      default: ''
    },
    preferredDate: {
      type: String,
      default: ''
    },
    preferredTime: {
      type: String,
      default: ''
    },
    specificLocation: {
      type: String,
      default: ''
    }
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  assignedTo: {
    type: String,
    default: ''
  },
  adminNotes: {
    type: String,
    default: ''
  },
  estimatedCompletion: {
    type: Date,
    default: null
  },
  actualCompletion: {
    type: Date,
    default: null
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate unique ID for cleanup requests
cleanupRequestSchema.pre('save', async function(next) {
  if (!this.id) {
    const count = await CleanupRequest.countDocuments();
    this.id = `CR${String(count + 1).padStart(4, '0')}`;
  }
  
  // Set problemLabel based on problemType
  if (!this.problemLabel) {
    const problemTypeLabels = {
      'litter': 'Litter & Trash',
      'dumping': 'Illegal Dumping',
      'graffiti': 'Graffiti/Vandalism',
      'overgrown': 'Overgrown Areas',
      'spill': 'Spills/Stains',
      'other': this.otherDetails.customProblemType || 'Other'
    };
    this.problemLabel = problemTypeLabels[this.problemType] || 'Unknown';
  }
  
  this.updatedAt = new Date();
  next();
});

const User = mongoose.model('User', userSchema);
const CleanupRequest = mongoose.model('CleanupRequest', cleanupRequestSchema);

// Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS  
    }
  });
};

// Middleware to verify JWT token
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

// ===== USER AUTHENTICATION ROUTES =====

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, deviceInfo } = req.body;

    const existingUser = await User.findOne({ email });
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

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      status: user.status,
      emailVerified: user.emailVerified,
      deviceInfo: user.deviceInfo,
      requestsCount: user.requestsCount,
      registeredAt: user.registeredAt,
      lastLogin: user.lastLogin
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
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
      id: user._id,
      name: user.name,
      fullName: user.name, 
      email: user.email,
      phone: user.phone,
      location: user.location,
      status: user.status,
      emailVerified: user.emailVerified,
      deviceInfo: user.deviceInfo,
      requestsCount: user.requestsCount,
      registeredAt: user.registeredAt,
      lastLogin: user.lastLogin
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

// Request Password Reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({ 
        message: 'If an account with that email exists, we have sent a password reset link.',
        success: true 
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ 
        message: 'Account is suspended. Please contact support.',
        success: false 
      });
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires > new Date()) {
      const timeLeft = Math.ceil((user.resetPasswordExpires - new Date()) / (1000 * 60));
      if (timeLeft > 55) { 
        return res.status(429).json({ 
          message: `Please wait ${timeLeft - 55} more minutes before requesting another reset.`,
          success: false 
        });
      }
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); 
    await user.save();

    const resetUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/reset-password/${resetToken}`
      : `http://localhost:3000/reset-password/${resetToken}`;

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10B981; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hello ${user.name},</p>
                <p>We received a request to reset your password for your Klingo account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #fff; padding: 10px; border-radius: 4px;">${resetUrl}</p>
                <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                <p>Best regards,<br>The Klingo Team</p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>`;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = createEmailTransporter();
        await transporter.sendMail({
          from: `"Klingo Support" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Password Reset Request - Klingo',
          html: emailHtml
        });
        console.log(`Password reset email sent to: ${user.email}`);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    } else {
      console.log('Email not configured, password reset token generated but email not sent');
      console.log(`Reset URL for ${user.email}: ${resetUrl}`);
    }

    res.json({ 
      message: 'If an account with that email exists, we have sent a password reset link.',
      success: true 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error processing password reset request' });
  }
});

// Reset Password
app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Password reset token is invalid or has expired',
        expired: true 
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    const jwtToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Password reset successful',
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        status: user.status,
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

// Verify Reset Token
app.get('/api/auth/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Password reset token is invalid or has expired',
        valid: false 
      });
    }

    res.json({ 
      message: 'Token is valid',
      valid: true,
      email: user.email 
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ message: 'Server error verifying token' });
  }
});

// ===== NEW: CLEANUP REQUEST ROUTES =====

// Submit Cleanup Request
app.post('/api/cleanup-requests', async (req, res) => {
  try {
    console.log('Received cleanup request:', req.body);
    
    const requestData = req.body;
    
    // Validate required fields
    if (!requestData.problemType || !requestData.severity || !requestData.description) {
      return res.status(400).json({ 
        message: 'Missing required fields: problemType, severity, and description are required' 
      });
    }

    // Validate contact info
    if (!requestData.contactInfo || !requestData.contactInfo.phone) {
      return res.status(400).json({ 
        message: 'Contact phone number is required' 
      });
    }

    // Prepare the cleanup request data
    const cleanupRequestData = {
      problemType: requestData.problemType,
      severity: requestData.severity,
      description: requestData.description,
      contactInfo: {
        name: requestData.contactInfo.name || 'Anonymous',
        phone: requestData.contactInfo.phone,
        email: requestData.contactInfo.email || ''
      },
      photos: requestData.photos || []
    };

    // Handle location based on problem type
    if (requestData.problemType === 'other') {
      cleanupRequestData.location = requestData.otherDetails?.specificLocation || 'Not specified';
      cleanupRequestData.otherDetails = {
        customProblemType: requestData.otherDetails?.customProblemType || '',
        preferredDate: requestData.otherDetails?.preferredDate || '',
        preferredTime: requestData.otherDetails?.preferredTime || '',
        specificLocation: requestData.otherDetails?.specificLocation || ''
      };
    } else {
      cleanupRequestData.location = requestData.location || 'Not specified';
    }

    // Set priority based on severity
    cleanupRequestData.priority = requestData.severity;

    // Create the cleanup request
    const cleanupRequest = new CleanupRequest(cleanupRequestData);
    await cleanupRequest.save();

    console.log('Cleanup request saved successfully:', cleanupRequest.id);

    // If user is authenticated, increment their request count
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        if (decoded.userId) {
          await User.findByIdAndUpdate(decoded.userId, {
            $inc: { requestsCount: 1 }
          });
          cleanupRequest.userId = decoded.userId;
          await cleanupRequest.save();
        }
      } catch (tokenError) {
        console.log('Token verification failed, treating as anonymous request');
      }
    }

    // Send confirmation email if email is provided
    if (cleanupRequest.contactInfo.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = createEmailTransporter();
        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #10B981; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .info-box { background-color: #fff; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #10B981; }
                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Request Status Update</h1>
                </div>
                <div class="content">
                    <p>Hello ${request.contactInfo.name},</p>
                    <p>${statusMessages[status]}.</p>
                    
                    <div class="status-box">
                        <h3>Updated Request Details:</h3>
                        <p><strong>Request ID:</strong> ${request.id}</p>
                        <p><strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
                        <p><strong>Type:</strong> ${request.problemLabel}</p>
                        <p><strong>Location:</strong> ${request.location}</p>
                        ${assignedTo ? `<p><strong>Assigned to:</strong> ${assignedTo}</p>` : ''}
                        ${estimatedCompletion ? `<p><strong>Estimated completion:</strong> ${new Date(estimatedCompletion).toLocaleDateString()}</p>` : ''}
                        ${adminNotes ? `<p><strong>Notes:</strong> ${adminNotes}</p>` : ''}
                    </div>
                    
                    <p>Thank you for your patience and for helping keep our community clean!</p>
                    <p>Best regards,<br>The Klingo Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated update. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>`;

        await transporter.sendMail({
          from: `"Klingo Support" <${process.env.EMAIL_USER}>`,
          to: request.contactInfo.email,
          subject: `Status Update: ${request.id} - ${statusMessages[status]}`,
          html: emailHtml
        });
        console.log(`Status update email sent to: ${request.contactInfo.email}`);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    }

    res.json({ 
      message: 'Request status updated successfully', 
      request 
    });

  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({ message: 'Server error updating request status' });
  }
});

// Update Cleanup Request (full update for admin)
app.put('/api/cleanup-requests/:id', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.id; // Prevent ID from being updated

    const request = await CleanupRequest.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!request) {
      return res.status(404).json({ message: 'Cleanup request not found' });
    }

    res.json({ 
      message: 'Request updated successfully', 
      request 
    });

  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ message: 'Server error updating request' });
  }
});

// Delete Cleanup Request (for admin)
app.delete('/api/cleanup-requests/:id', async (req, res) => {
  try {
    const request = await CleanupRequest.findOneAndDelete({ id: req.params.id });

    if (!request) {
      return res.status(404).json({ message: 'Cleanup request not found' });
    }

    res.json({ message: 'Request deleted successfully' });

  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ message: 'Server error deleting request' });
  }
});

// Get Cleanup Request Statistics
app.get('/api/cleanup-requests/stats/summary', async (req, res) => {
  try {
    const [
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      highPriorityRequests,
      recentRequests
    ] = await Promise.all([
      CleanupRequest.countDocuments(),
      CleanupRequest.countDocuments({ status: 'pending' }),
      CleanupRequest.countDocuments({ status: 'in-progress' }),
      CleanupRequest.countDocuments({ status: 'completed' }),
      CleanupRequest.countDocuments({ priority: 'high' }),
      CleanupRequest.countDocuments({ 
        submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
    ]);

    // Get requests by problem type
    const requestsByType = await CleanupRequest.aggregate([
      {
        $group: {
          _id: '$problemType',
          count: { $sum: 1 },
          label: { $first: '$problemLabel' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get completion rate
    const completionRate = totalRequests > 0 ? 
      Math.round((completedRequests / totalRequests) * 100) : 0;

    res.json({
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      highPriorityRequests,
      recentRequests,
      completionRate,
      requestsByType
    });

  } catch (error) {
    console.error('Get cleanup stats error:', error);
    res.status(500).json({ message: 'Server error fetching cleanup statistics' });
  }
});

// ===== EXISTING USER ROUTES =====

// Get all users (for admin dashboard)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -resetPasswordToken').sort({ registeredAt: -1 });
    
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      status: user.status,
      emailVerified: user.emailVerified,
      deviceInfo: user.deviceInfo,
      requestsCount: user.requestsCount,
      registeredAt: user.registeredAt,
      lastLogin: user.lastLogin
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Get single user
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password -resetPasswordToken');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      status: user.status,
      emailVerified: user.emailVerified,
      deviceInfo: user.deviceInfo,
      requestsCount: user.requestsCount,
      registeredAt: user.registeredAt,
      lastLogin: user.lastLogin
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

// Update user status (for admin)
app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, select: '-password -resetPasswordToken' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User status updated successfully', user });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
});

// Update user profile
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, location } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, location },
      { new: true, select: '-password -resetPasswordToken' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Delete user (for admin)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// Get user statistics (for dashboard)
app.get('/api/stats/users', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    
    // Users registered in the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({ 
      registeredAt: { $gte: weekAgo } 
    });

    res.json({
      totalUsers,
      activeUsers,
      verifiedUsers,
      newUsersThisWeek
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

// Get Combined Dashboard Statistics
app.get('/api/stats/dashboard', async (req, res) => {
  try {
    const [userStats, cleanupStats] = await Promise.all([
      // User stats
      Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ emailVerified: true }),
        User.countDocuments({ 
          registeredAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        })
      ]),
      // Cleanup stats
      Promise.all([
        CleanupRequest.countDocuments(),
        CleanupRequest.countDocuments({ status: 'pending' }),
        CleanupRequest.countDocuments({ status: 'in-progress' }),
        CleanupRequest.countDocuments({ status: 'completed' }),
        CleanupRequest.countDocuments({ priority: 'high' }),
        CleanupRequest.countDocuments({ 
          submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        })
      ])
    ]);

    const [totalUsers, activeUsers, verifiedUsers, newUsersThisWeek] = userStats;
    const [totalRequests, pendingRequests, inProgressRequests, completedRequests, highPriorityRequests, recentRequests] = cleanupStats;

    // Get recent activity (last 10 requests)
    const recentActivity = await CleanupRequest.find()
      .sort({ submittedAt: -1 })
      .limit(10)
      .select('id problemLabel status submittedAt location contactInfo.name')
      .lean();

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        verified: verifiedUsers,
        newThisWeek: newUsersThisWeek
      },
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        inProgress: inProgressRequests,
        completed: completedRequests,
        highPriority: highPriorityRequests,
        recentRequests: recentRequests,
        completionRate: totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0
      },
      recentActivity: recentActivity.map(request => ({
        id: request.id,
        type: request.problemLabel,
        status: request.status,
        submittedAt: request.submittedAt,
        location: request.location,
        contactName: request.contactInfo.name
      }))
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard statistics' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB connection state: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
}); text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Cleanup Request Received</h1>
                </div>
                <div class="content">
                    <p>Hello ${cleanupRequest.contactInfo.name},</p>
                    <p>Thank you for submitting a cleanup request. We have received your request and our team will review it shortly.</p>
                    
                    <div class="info-box">
                        <h3>Request Details:</h3>
                        <p><strong>Request ID:</strong> ${cleanupRequest.id}</p>
                        <p><strong>Type:</strong> ${cleanupRequest.problemLabel}</p>
                        <p><strong>Priority:</strong> ${cleanupRequest.priority.charAt(0).toUpperCase() + cleanupRequest.priority.slice(1)}</p>
                        <p><strong>Location:</strong> ${cleanupRequest.location}</p>
                        <p><strong>Status:</strong> Pending Review</p>
                    </div>
                    
                    <p>We will contact you at <strong>${cleanupRequest.contactInfo.phone}</strong> if we need any additional information.</p>
                    <p>You can reference your request using ID: <strong>${cleanupRequest.id}</strong></p>
                    
                    <p>Thank you for helping keep our community clean!</p>
                    <p>Best regards,<br>The Klingo Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated confirmation. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>`;

        await transporter.sendMail({
          from: `"Klingo Support" <${process.env.EMAIL_USER}>`,
          to: cleanupRequest.contactInfo.email,
          subject: `Cleanup Request Confirmation - ${cleanupRequest.id}`,
          html: emailHtml
        });
        console.log(`Confirmation email sent to: ${cleanupRequest.contactInfo.email}`);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    }

    res.status(201).json({
      message: 'Cleanup request submitted successfully',
      success: true,
      request: {
        id: cleanupRequest.id,
        problemLabel: cleanupRequest.problemLabel,
        status: cleanupRequest.status,
        submittedAt: cleanupRequest.submittedAt
      }
    });

  } catch (error) {
    console.error('Submit cleanup request error:', error);
    res.status(500).json({ 
      message: 'Server error submitting cleanup request',
      error: error.message 
    });
  }
});

// Get All Cleanup Requests (for admin dashboard)
app.get('/api/cleanup-requests', async (req, res) => {
  try {
    const {
      status,
      priority,
      problemType,
      limit = 50,
      offset = 0,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    if (problemType && problemType !== 'all') filter.problemType = problemType;
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { id: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { problemLabel: { $regex: search, $options: 'i' } },
        { 'contactInfo.name': { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const requests = await CleanupRequest.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('userId', 'name email')
      .lean();

    const total = await CleanupRequest.countDocuments(filter);

    // Format requests for frontend
    const formattedRequests = requests.map(request => ({
      id: request.id,
      problemType: request.problemType,
      problemLabel: request.problemLabel,
      location: request.location,
      severity: request.severity,
      priority: request.priority,
      description: request.description,
      contactInfo: request.contactInfo,
      photos: request.photos,
      otherDetails: request.otherDetails,
      status: request.status,
      assignedTo: request.assignedTo,
      adminNotes: request.adminNotes,
      estimatedCompletion: request.estimatedCompletion,
      actualCompletion: request.actualCompletion,
      submittedAt: request.submittedAt,
      updatedAt: request.updatedAt,
      user: request.userId ? {
        id: request.userId._id,
        name: request.userId.name,
        email: request.userId.email
      } : null
    }));

    res.json({
      requests: formattedRequests,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });

  } catch (error) {
    console.error('Get cleanup requests error:', error);
    res.status(500).json({ message: 'Server error fetching cleanup requests' });
  }
});

// Get Single Cleanup Request
app.get('/api/cleanup-requests/:id', async (req, res) => {
  try {
    const request = await CleanupRequest.findOne({ id: req.params.id })
      .populate('userId', 'name email phone location');

    if (!request) {
      return res.status(404).json({ message: 'Cleanup request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Get cleanup request error:', error);
    res.status(500).json({ message: 'Server error fetching cleanup request' });
  }
});

// Update Cleanup Request Status (for admin)
app.patch('/api/cleanup-requests/:id/status', async (req, res) => {
  try {
    const { status, adminNotes, assignedTo, estimatedCompletion } = req.body;

    if (!['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData = { 
      status,
      updatedAt: new Date()
    };

    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (estimatedCompletion !== undefined) updateData.estimatedCompletion = estimatedCompletion;
    
    // Set actual completion date if status is completed
    if (status === 'completed') {
      updateData.actualCompletion = new Date();
    }

    const request = await CleanupRequest.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: 'Cleanup request not found' });
    }

    // Send status update email if contact email is available
    if (request.contactInfo.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = createEmailTransporter();
        const statusMessages = {
          'pending': 'Your request is pending review',
          'in-progress': 'Work has begun on your request',
          'completed': 'Your cleanup request has been completed',
          'cancelled': 'Your request has been cancelled'
        };

        const emailHtml = `
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10B981; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hello ${user.name},</p>
                <p>We received a request to reset your password for your Klingo account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #fff; padding: 10px; border-radius: 4px;">${resetUrl}</p>
                <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                <p>Best regards,<br>The Klingo Team</p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>`;

    // Send email (only if email configuration is available)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = createEmailTransporter();
        await transporter.sendMail({
          from: `"Klingo Support" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Password Reset Request - Klingo',
          html: emailHtml
        });
        console.log(`Password reset email sent to: ${user.email}`);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the request if email fails, just log it
      }
    } else {
      console.log('Email not configured, password reset token generated but email not sent');
      console.log(`Reset URL for ${user.email}: ${resetUrl}`);
    }

    res.json({ 
      message: 'If an account with that email exists, we have sent a password reset link.',
      success: true 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error processing password reset request' });
  }
});

// Reset Password
app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Password reset token is invalid or has expired',
        expired: true 
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Generate new JWT token
    const jwtToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Password reset successful',
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        status: user.status,
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

// Verify Reset Token (to check if token is valid before showing reset form)
app.get('/api/auth/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Password reset token is invalid or has expired',
        valid: false 
      });
    }

    res.json({ 
      message: 'Token is valid',
      valid: true,
      email: user.email 
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ message: 'Server error verifying token' });
  }
});

// Get all users (for admin dashboard)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password -resetPasswordToken').sort({ registeredAt: -1 });
    
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      status: user.status,
      emailVerified: user.emailVerified,
      deviceInfo: user.deviceInfo,
      requestsCount: user.requestsCount,
      registeredAt: user.registeredAt,
      lastLogin: user.lastLogin
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Get single user
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password -resetPasswordToken');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      status: user.status,
      emailVerified: user.emailVerified,
      deviceInfo: user.deviceInfo,
      requestsCount: user.requestsCount,
      registeredAt: user.registeredAt,
      lastLogin: user.lastLogin
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

// Update user status (for admin)
app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, select: '-password -resetPasswordToken' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User status updated successfully', user });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
});

// Update user profile
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, location } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, location },
      { new: true, select: '-password -resetPasswordToken' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Delete user (for admin)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// Get user statistics (for dashboard)
app.get('/api/stats/users', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    
    // Users registered in the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({ 
      registeredAt: { $gte: weekAgo } 
    });

    res.json({
      totalUsers,
      activeUsers,
      verifiedUsers,
      newUsersThisWeek
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB connection state: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
});