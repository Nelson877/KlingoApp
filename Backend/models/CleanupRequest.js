const mongoose = require('mongoose');

// Cleanup Request Schema
const cleanupRequestSchema = new mongoose.Schema({
  problemType: {
    type: String,
    required: [true, 'Problem type is required'],
    enum: {
      values: ['litter', 'dumping', 'graffiti', 'overgrown', 'spill', 'other'],
      message: '{VALUE} is not a valid problem type'
    }
  },
  problemLabel: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    minlength: [3, 'Location must be at least 3 characters long'],
    maxlength: [500, 'Location cannot exceed 500 characters']
  },
  severity: {
    type: String,
    required: [true, 'Severity level is required'],
    enum: {
      values: ['low', 'medium', 'high'],
      message: '{VALUE} is not a valid severity level'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  contactInfo: {
    name: {
      type: String,
      default: 'Anonymous',
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: function(v) {
          // Basic phone validation - accepts various formats
          return /^[\d\s\-\+\(\)]+$/.test(v) && v.replace(/\D/g, '').length >= 10;
        },
        message: 'Please provide a valid phone number'
      }
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      validate: {
        validator: function(v) {
          // Email is optional, but if provided, must be valid
          if (!v || v === '') return true;
          return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
        },
        message: 'Please provide a valid email address'
      }
    }
  },
  photos: [{
    type: String,
    trim: true
  }],
  otherDetails: {
    customProblemType: {
      type: String,
      trim: true,
      maxlength: [200, 'Custom problem type cannot exceed 200 characters']
    },
    preferredDate: {
      type: String,
      trim: true
    },
    preferredTime: {
      type: String,
      trim: true
    },
    specificLocation: {
      type: String,
      trim: true,
      maxlength: [500, 'Specific location cannot exceed 500 characters']
    }
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: function() {
      return this.severity; 
    }
  },
  assignedTo: {
    type: String,
    default: '',
    trim: true
  },
  adminNotes: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Admin notes cannot exceed 500 characters']
  },
  estimatedCompletion: {
    type: Date
  },
  actualCompletion: {
    type: Date
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  coordinates: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  deviceInfo: {
    type: String,
    default: ''
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for better query performance
cleanupRequestSchema.index({ status: 1, createdAt: -1 });
cleanupRequestSchema.index({ severity: 1, createdAt: -1 });
cleanupRequestSchema.index({ problemType: 1 });
cleanupRequestSchema.index({ location: 'text', description: 'text' });
cleanupRequestSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

// Virtual for formatted problem label
cleanupRequestSchema.virtual('formattedProblemLabel').get(function() {
  const problemTypes = {
    litter: 'Litter & Trash',
    dumping: 'Illegal Dumping',
    graffiti: 'Graffiti/Vandalism',
    overgrown: 'Overgrown Areas',
    spill: 'Spills/Stains',
    other: this.otherDetails?.customProblemType || 'Other'
  };
  return problemTypes[this.problemType] || this.problemType;
});

// Instance method to update status
cleanupRequestSchema.methods.updateStatus = async function(newStatus, adminNotes = '') {
  this.status = newStatus;
  
  if (adminNotes) {
    this.adminNotes = adminNotes;
  }
  
  // Set completion date when status changes to completed
  if (newStatus === 'completed' && !this.actualCompletion) {
    this.actualCompletion = new Date();
  }
  
  return this.save();
};

// Instance method to assign request
cleanupRequestSchema.methods.assignTo = async function(assignee, estimatedCompletion = null) {
  this.assignedTo = assignee;
  this.status = 'in-progress';
  
  if (estimatedCompletion) {
    this.estimatedCompletion = new Date(estimatedCompletion);
  }
  
  return this.save();
};

// Static method to get statistics
cleanupRequestSchema.statics.getStats = async function() {
  // Status counts
  const statusPipeline = [
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];
  
  const statusCounts = await this.aggregate(statusPipeline);
  const stats = {
    total: 0,
    pending: 0,
    'in-progress': 0,
    completed: 0,
    cancelled: 0
  };
  
  statusCounts.forEach(item => {
    stats[item._id] = item.count;
    stats.total += item.count;
  });
  
  // Severity distribution
  const severityPipeline = [
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 }
      }
    }
  ];
  
  const severityCounts = await this.aggregate(severityPipeline);
  const severityStats = {
    low: 0,
    medium: 0,
    high: 0
  };
  
  severityCounts.forEach(item => {
    severityStats[item._id] = item.count;
  });
  
  // Recent requests (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentCount = await this.countDocuments({ 
    createdAt: { $gte: weekAgo } 
  });
  
  // Today's requests
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await this.countDocuments({
    createdAt: { $gte: today }
  });
  
  return {
    ...stats,
    severity: severityStats,
    recentRequests: recentCount,
    todayRequests: todayCount
  };
};

// Static method to search requests
cleanupRequestSchema.statics.search = function(query = '', filters = {}) {
  const searchQuery = {};
  
  // Text search
  if (query.trim()) {
    searchQuery.$or = [
      { location: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { 'contactInfo.name': { $regex: query, $options: 'i' } },
      { 'otherDetails.customProblemType': { $regex: query, $options: 'i' } },
      { problemLabel: { $regex: query, $options: 'i' } }
    ];
  }
  
  // Apply filters
  if (filters.status) {
    searchQuery.status = filters.status;
  }
  
  if (filters.severity) {
    searchQuery.severity = filters.severity;
  }
  
  if (filters.problemType) {
    searchQuery.problemType = filters.problemType;
  }
  
  if (filters.dateFrom || filters.dateTo) {
    searchQuery.createdAt = {};
    if (filters.dateFrom) {
      searchQuery.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      searchQuery.createdAt.$lte = new Date(filters.dateTo);
    }
  }
  
  return this.find(searchQuery).sort({ createdAt: -1 });
};

// Pre-save middleware to set problemLabel
cleanupRequestSchema.pre('save', function(next) {
  if (!this.problemLabel || this.isModified('problemType')) {
    const problemTypes = {
      litter: 'Litter & Trash',
      dumping: 'Illegal Dumping',
      graffiti: 'Graffiti/Vandalism',
      overgrown: 'Overgrown Areas',
      spill: 'Spills/Stains',
      other: this.otherDetails?.customProblemType || 'Other Service'
    };
    this.problemLabel = problemTypes[this.problemType] || this.problemType;
  }
  
  next();
});

// Transform output to remove sensitive data and format response
cleanupRequestSchema.methods.toJSON = function() {
  const request = this.toObject({ virtuals: true });
  
  // Add formatted problem label if not present
  if (!request.problemLabel) {
    request.problemLabel = this.formattedProblemLabel;
  }
  
  // Remove MongoDB specific fields
  delete request.__v;
  
  return request;
};

const CleanupRequest = mongoose.model('CleanupRequest', cleanupRequestSchema);

module.exports = CleanupRequest;