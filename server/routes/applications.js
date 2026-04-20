const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const { AuditLog, Notification } = require('../models/AuditLog');
const { protect, adminOnly, studentOnly } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');

// Multer config for CSV uploads
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/csv';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `bulk-app-${Date.now()}${path.extname(file.originalname)}`)
});
const csvUpload = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Only CSV files allowed'));
  }
});

// ─── GET all applications (admin) ───────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, opportunityId, studentId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (opportunityId) query.opportunity = opportunityId;
    if (studentId) query.student = studentId;

    const total = await Application.countDocuments(query);
    const applications = await Application.find(query)
      .populate('student', 'name studentId email department cgpa amcatScore')
      .populate('opportunity', 'companyName role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, applications, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET my applications (student) ──────────────────────────
router.get('/my', protect, studentOnly, async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate('opportunity', 'companyName role location salary status applicationDeadline driveDate')
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── APPLY for opportunity (student) ────────────────────────
router.post('/:opportunityId/apply', protect, studentOnly, async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.opportunityId);
    if (!opp) return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    if (opp.status !== 'active') return res.status(400).json({ success: false, message: 'This opportunity is no longer accepting applications.' });
    if (opp.applicationDeadline && new Date() > opp.applicationDeadline) {
      return res.status(400).json({ success: false, message: 'Application deadline has passed.' });
    }

    // Eligibility check
    const { cgpa, amcatScore, department, batch, resume } = req.user;
    
    if (!resume) {
      return res.status(400).json({ success: false, message: 'Please upload your resume before applying.' });
    }
    
    const { eligibility } = opp;
    if (cgpa < eligibility.minCGPA) {
      return res.status(400).json({ success: false, message: `CGPA ${cgpa} does not meet minimum requirement of ${eligibility.minCGPA}.` });
    }
    if (eligibility.minAMCAT > 0 && amcatScore < eligibility.minAMCAT) {
      return res.status(400).json({ success: false, message: `AMCAT score ${amcatScore} does not meet requirement.` });
    }
    if (eligibility.departments.length > 0 && !eligibility.departments.includes(department)) {
      return res.status(400).json({ success: false, message: `Your department (${department}) is not eligible.` });
    }

    let application = await Application.findOne({ student: req.user._id, opportunity: opp._id });
    
    if (application) {
      if (application.status !== 'withdrawn') {
        return res.status(400).json({ success: false, message: 'You have already applied to this opportunity.' });
      }
      application.status = 'applied';
      application.resumeSnapshot = req.user.resume;
      application.cgpaAtApplication = cgpa;
      application.amcatAtApplication = amcatScore;
      application.statusHistory.push({ status: 'applied', changedBy: req.user._id, note: 'Re-applied' });
      await application.save();
    } else {
      application = await Application.create({
        student: req.user._id,
        opportunity: opp._id,
        resumeSnapshot: req.user.resume,
        cgpaAtApplication: cgpa,
        amcatAtApplication: amcatScore,
        statusHistory: [{ status: 'applied', changedBy: req.user._id }]
      });
    }

    // Increment application count
    await Opportunity.findByIdAndUpdate(opp._id, { $inc: { totalApplications: 1 } });

    res.status(201).json({ success: true, application });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'You have already applied to this opportunity.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── UPDATE application status (admin) ──────────────────────
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['applied', 'shortlisted', 'rejected', 'selected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const application = await Application.findById(req.params.id)
      .populate('student', 'name email')
      .populate('opportunity', 'companyName role');

    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    application.status = status;
    application.notes = note || application.notes;
    application.statusHistory.push({ status, changedBy: req.user._id, note });
    await application.save();

    // Notify student
    await Notification.create({
      recipient: application.student._id,
      type: 'status_update',
      title: `Application ${status}: ${application.opportunity.companyName}`,
      message: `Your application for ${application.opportunity.role} at ${application.opportunity.companyName} has been ${status}.`,
      relatedId: application._id
    });

    // Send email
    const { subject, html } = emailTemplates.statusUpdate(
      application.student.name, application.opportunity.companyName,
      application.opportunity.role, status
    );
    sendEmail({ to: application.student.email, subject, html });

    res.json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── WITHDRAW application (student) ─────────────────────────
router.delete('/:id/withdraw', protect, studentOnly, async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, student: req.user._id });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (!['applied'].includes(application.status)) {
      return res.status(400).json({ success: false, message: 'Cannot withdraw after shortlisting.' });
    }

    application.status = 'withdrawn';
    application.statusHistory.push({ status: 'withdrawn', changedBy: req.user._id });
    await application.save();

    await Opportunity.findByIdAndUpdate(application.opportunity, { $inc: { totalApplications: -1 } });

    res.json({ success: true, message: 'Application withdrawn.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/bulk-update-results', protect, adminOnly, csvUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const { opportunityId } = req.body;
  if (!opportunityId) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: 'Opportunity ID is required.' });
  }

  const rows = [];
  try {
    const opp = await Opportunity.findById(opportunityId);
    if (!opp) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Opportunity not found.' });
    }

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // Extract studentIds from CSV
    const csvStudentIds = new Set();
    for (const dbRow of rows) {
      const row = {};
      for (const key in dbRow) {
        row[key.trim().toLowerCase()] = dbRow[key];
      }
      const studentId = row['student id'] || row['studentid'] || row['student_id'] || row['id'];
      if (studentId && studentId.trim() !== '') {
        csvStudentIds.add(studentId.trim().toUpperCase());
      }
    }

    const applications = await Application.find({ opportunity: opportunityId }).populate('student', 'studentId name email placementStatus');
    
    let selectedCount = 0;
    let rejectedCount = 0;

    for (const application of applications) {
      if (!application.student || !application.student.studentId) continue;
      
      const isSelected = csvStudentIds.has(application.student.studentId.toUpperCase());
      const newStatus = isSelected ? 'selected' : 'rejected';
      
      application.status = newStatus;
      application.statusHistory.push({ status: newStatus, changedBy: req.user._id, note: 'Bulk Override Result' });
      await application.save();

      if (isSelected) {
        selectedCount++;
        // Optional: auto-mark placementStatus for selected
        if (application.student.placementStatus !== 'placed') {
          application.student.placementStatus = 'placed';
          await application.student.save();
        }
      } else {
        rejectedCount++;
      }

      await Notification.create({
        recipient: application.student._id,
        type: 'status_update',
        title: `Placement Update: ${opp.companyName}`,
        message: isSelected 
          ? `Congratulations! You have been selected at ${opp.companyName} for the ${opp.role} position.`
          : `Your application for ${opp.role} at ${opp.companyName} has been evaluated. Better luck next time!`,
        relatedId: application._id
      });
      
      const { subject, html } = emailTemplates.statusUpdate(
        application.student.name, opp.companyName, opp.role, newStatus
      );
      sendEmail({ to: application.student.email, subject, html });
    }

    fs.unlinkSync(req.file.path);
    res.json({
      success: true,
      summary: { total: applications.length, selected: selectedCount, rejected: rejectedCount }
    });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
