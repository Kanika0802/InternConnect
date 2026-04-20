const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  jobType: {
    type: String,
    enum: ['internship', 'placement', 'both'],
    default: 'placement'
  },
  location: {
    type: String,
    trim: true
  },
  salary: {
    type: String,
    trim: true
  },
  eligibility: {
    minCGPA: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },
    minAMCAT: {
      type: Number,
      default: 0
    },
    departments: {
      type: [String],
      default: []   // empty = all departments eligible
    },
    batch: {
      type: String  // empty = all batches
    }
  },
  applicationDeadline: {
    type: Date
  },
  driveDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'closed'],
    default: 'active'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalApplications: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Text index for search
opportunitySchema.index({ companyName: 'text', role: 'text', description: 'text' });

module.exports = mongoose.model('Opportunity', opportunitySchema);
