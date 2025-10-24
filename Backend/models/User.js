const mongoose = require('mongoose');

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

// Instance method to transform user object (removes sensitive data)
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.__v;
  return user;
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Virtual for user's full profile (can be used for responses)
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    location: this.location,
    status: this.status,
    emailVerified: this.emailVerified,
    deviceInfo: this.deviceInfo,
    requestsCount: this.requestsCount,
    registeredAt: this.registeredAt,
    lastLogin: this.lastLogin
  };
});

const User = mongoose.model('User', userSchema);

module.exports = User;