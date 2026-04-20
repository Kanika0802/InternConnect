const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity',
    required: true
  },
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'rejected', 'selected', 'withdrawn'],
    default: 'applied'
  },
  currentRound: {
    type: String
  },
  resumeSnapshot: {
    type: String  // path at time of application
  },
  cgpaAtApplication: {
    type: Number
  },
  amcatAtApplication: {
    type: Number
  },
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  notes: {
    type: String  // admin notes
  }
}, {
  timestamps: true
});

// Unique: one application per student per opportunity
applicationSchema.index({ student: 1, opportunity: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
