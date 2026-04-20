const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const { Notification } = require('../models/AuditLog');
const { protect, adminOnly } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');

// Eligibility check helper
const checkEligibility = (student, opportunity) => {
  const reasons = [];
  const { eligibility } = opportunity;

  if (student.cgpa < eligibility.minCGPA) {
    reasons.push(`CGPA ${student.cgpa} < required ${eligibility.minCGPA}`);
  }
  if (eligibility.minAMCAT > 0 && student.amcatScore < eligibility.minAMCAT) {
    reasons.push(`AMCAT ${student.amcatScore} < required ${eligibility.minAMCAT}`);
  }
  if (eligibility.departments.length > 0 && !eligibility.departments.includes(student.department)) {
    reasons.push(`Department ${student.department} not in eligible list`);
  }
  if (eligibility.batch && student.batch && eligibility.batch !== student.batch) {
    reasons.push(`Batch ${student.batch} not eligible`);
  }

  return { eligible: reasons.length === 0, reasons };
};

// ─── GET all opportunities ───────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, jobType } = req.query;
    const query = {};

    if (search) {
      query.$text = { $search: search };
    }
    if (status) query.status = status;
    if (jobType) query.jobType = jobType;

    const total = await Opportunity.countDocuments(query);
    const opportunities = await Opportunity.find(query)
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // For students, attach eligibility info
    if (req.user.role === 'student') {
      const enriched = opportunities.map(opp => {
        const { eligible, reasons } = checkEligibility(req.user, opp);
        return { ...opp.toObject(), eligible, ineligibilityReasons: reasons };
      });
      return res.json({ success: true, opportunities: enriched, total, pages: Math.ceil(total / limit) });
    }

    res.json({ success: true, opportunities, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET single opportunity ──────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.id).populate('postedBy', 'name');
    if (!opp) return res.status(404).json({ success: false, message: 'Opportunity not found.' });

    let response = opp.toObject();
    if (req.user.role === 'student') {
      const { eligible, reasons } = checkEligibility(req.user, opp);
      response = { ...response, eligible, ineligibilityReasons: reasons };
    }

    res.json({ success: true, opportunity: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CREATE opportunity (admin) ──────────────────────────────
router.post('/', protect, adminOnly, [
  body('companyName').notEmpty(),
  body('role').notEmpty(),
  body('description').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const opp = await Opportunity.create({ ...req.body, postedBy: req.user._id });

    // Notify eligible students
    const eligibleStudents = await User.find({
      role: 'student',
      isActive: true,
      cgpa: { $gte: opp.eligibility.minCGPA },
      ...(opp.eligibility.minAMCAT > 0 && { amcatScore: { $gte: opp.eligibility.minAMCAT } }),
      ...(opp.eligibility.departments.length > 0 && { department: { $in: opp.eligibility.departments } })
    });

    const notifDocs = eligibleStudents.map(s => ({
      recipient: s._id,
      type: 'new_opportunity',
      title: `New opportunity: ${opp.role} at ${opp.companyName}`,
      message: `You are eligible! Apply before ${opp.applicationDeadline ? new Date(opp.applicationDeadline).toLocaleDateString() : 'the deadline'}.`,
      relatedId: opp._id
    }));

    await Notification.insertMany(notifDocs);

    // Email (async, first 50 only to avoid rate limits)
    eligibleStudents.slice(0, 50).forEach(s => {
      const { subject, html } = emailTemplates.newOpportunity(s.name, opp.companyName, opp.role, opp.applicationDeadline);
      sendEmail({ to: s.email, subject, html });
    });

    res.status(201).json({ success: true, opportunity: opp, notified: eligibleStudents.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── UPDATE opportunity (admin) ──────────────────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const opp = await Opportunity.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!opp) return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    res.json({ success: true, opportunity: opp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE opportunity (admin) ──────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const opp = await Opportunity.findByIdAndDelete(req.params.id);
    if (!opp) return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    res.json({ success: true, message: 'Opportunity deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
