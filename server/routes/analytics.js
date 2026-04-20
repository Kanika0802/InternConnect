const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const { AuditLog } = require('../models/AuditLog');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET analytics (admin) ───────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const [totalStudents, totalOpportunities, totalApplications] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      Opportunity.countDocuments(),
      Application.countDocuments()
    ]);

    const placedStudents = await User.countDocuments({ role: 'student', placementStatus: 'placed' });

    // Applications per company (top 10)
    const appPerCompany = await Application.aggregate([
      { $lookup: { from: 'opportunities', localField: 'opportunity', foreignField: '_id', as: 'opp' } },
      { $unwind: '$opp' },
      { $group: { _id: '$opp.companyName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // CGPA distribution buckets
    const cgpaDistribution = await User.aggregate([
      { $match: { role: 'student' } },
      { $bucket: {
        groupBy: '$cgpa',
        boundaries: [0, 5, 6, 7, 8, 9, 10.1],
        default: 'unknown',
        output: { count: { $sum: 1 } }
      }}
    ]);

    // Applications by status
    const appByStatus = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Monthly registrations (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyReg = await User.aggregate([
      { $match: { role: 'student', createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      stats: { totalStudents, totalOpportunities, totalApplications, placedStudents },
      appPerCompany,
      cgpaDistribution,
      appByStatus,
      monthlyReg
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
