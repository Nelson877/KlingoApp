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
app.use(express.json());

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

const User = mongoose.model('User', userSchema);

// Email transporter configuration
const createEmailTransporter = () => {
  // For development, you can use a service like Gmail or a testing service like Ethereal
  // For production, use services like SendGrid, AWS SES, etc.
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS  
    }
  });
  
  // Alternative for testing (Ethereal Email - creates test accounts)
  // return nodemailer.createTransporter({
  //   host: 'smtp.ethereal.email',
  //   port: 587,
  //   auth: {
  //     user: 'ethereal.user@ethereal.email',
  //     pass: 'ethereal.pass'
  //   }
  // });
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

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, deviceInfo } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      name: fullName,
      email,
      password: hashedPassword,
      deviceInfo: deviceInfo || 'Unknown Device',
      location: 'Ghana' 
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return user data without password
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

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Please contact support.' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return user data without password
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

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return success even if user doesn't exist (security practice)
      return res.json({ 
        message: 'If an account with that email exists, we have sent a password reset link.',
        success: true 
      });
    }

    // Check if user account is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        message: 'Account is suspended. Please contact support.',
        success: false 
      });
    }

    // Rate limiting: Check if a reset was requested recently (prevent spam)
    if (user.resetPasswordExpires && user.resetPasswordExpires > new Date()) {
      const timeLeft = Math.ceil((user.resetPasswordExpires - new Date()) / (1000 * 60));
      if (timeLeft > 55) { 
        return res.status(429).json({ 
          message: `Please wait ${timeLeft - 55} more minutes before requesting another reset.`,
          success: false 
        });
      }
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set reset token and expiration (1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); 
    await user.save();

    // Create reset URL
    const resetUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/reset-password/${resetToken}`
      : `http://localhost:3000/reset-password/${resetToken}`;

    // Email content
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