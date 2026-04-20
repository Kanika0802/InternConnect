const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { AuditLog, Notification } = require('../models/AuditLog');
const { protect, adminOnly, studentOnly } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');

// Multer config for CSV/Excel uploads
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/csv';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `bulk-${Date.now()}${path.extname(file.originalname)}`)
});
const csvUpload = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) cb(null, true);
    else cb(new Error('Only CSV/Excel files allowed'));
  }
});

// Resume upload config
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/resumes';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `resume-${req.user._id}-${Date.now()}.pdf`)
});
const resumeUpload = multer({
  storage: resumeStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB
});

const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const parseRowData = (row) => ({
  studentId: (row['Student ID'] || row['studentId'] || row['student_id'] || '').toString().trim().toUpperCase(),
  name: (row['Name'] || row['name'] || '').toString().trim(),
  email: (row['Email'] || row['email'] || '').toString().trim().toLowerCase(),
  cgpa: parseFloat(row['CGPA'] || row['cgpa'] || 0),
  amcatScore: parseFloat(row['AMCAT Score'] || row['amcatScore'] || row['amcat_score'] || 0),
  department: (row['Department'] || row['department'] || row['Branch'] || row['branch'] || '').toString().trim(),
  batch: (row['Batch'] || row['batch'] || '').toString().trim(),
  dob: (row['DOB'] || row['dob'] || row['Date of Birth'] || '').toString().trim()
});

// ─── GET all students (admin) ───────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, department, status } = req.query;
    const query = { role: 'student' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) query.department = department;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const total = await User.countDocuments(query);
    const students = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, students, total, pages: Math.ceil(total / limit), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET single student ─────────────────────────────────────
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student')
      return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CREATE single student (admin) ─────────────────────────
router.post('/', protect, adminOnly, [
  body('studentId').notEmpty(),
  body('name').notEmpty(),
  body('email').isEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const password = req.body.dob || req.body.studentId;
    const student = await User.create({ ...req.body, password, isFirstLogin: true, role: 'student' });

    await AuditLog.create({
      action: 'CREATE_STUDENT',
      performedBy: req.user._id,
      targetUser: student._id,
      targetId: student.studentId,
      description: `Student account created for ${student.name}`
    });

    // Send email (non-blocking)
    const { subject, html } = emailTemplates.accountCreated(
      student.name, student.studentId, password,
      process.env.CLIENT_URL + '/login'
    );
    sendEmail({ to: student.email, subject, html });

    res.status(201).json({ success: true, student, temporaryPassword: password });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Student ID or email already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── UPDATE student (admin) ─────────────────────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student')
      return res.status(404).json({ success: false, message: 'Student not found.' });

    const allowedFields = ['name', 'email', 'cgpa', 'amcatScore', 'department', 'phone', 'batch', 'isActive', 'placementStatus'];
    const changes = [];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && String(student[field]) !== String(req.body[field])) {
        changes.push({ field, oldValue: student[field], newValue: req.body[field] });
        student[field] = req.body[field];
      }
    });

    await student.save();

    if (changes.length > 0) {
      await AuditLog.create({
        action: 'UPDATE_STUDENT',
        performedBy: req.user._id,
        targetUser: student._id,
        targetId: student.studentId,
        changes,
        description: `Updated fields: ${changes.map(c => c.field).join(', ')}`
      });
    }

    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE student (admin) ─────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student')
      return res.status(404).json({ success: false, message: 'Student not found.' });

    await AuditLog.create({
      action: 'DELETE_STUDENT',
      performedBy: req.user._id,
      targetId: student.studentId,
      description: `Deleted student: ${student.name} (${student.studentId})`
    });

    await student.deleteOne();
    res.json({ success: true, message: 'Student deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── RESET password (admin) ─────────────────────────────────
router.post('/:id/reset-password', protect, adminOnly, async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student')
      return res.status(404).json({ success: false, message: 'Student not found.' });

    const newPassword = student.dob || student.studentId;
    student.password = newPassword;
    student.isFirstLogin = true;
    await student.save();

    const { subject, html } = emailTemplates.accountCreated(
      student.name, student.studentId, newPassword, process.env.CLIENT_URL + '/login'
    );
    sendEmail({ to: student.email, subject, html });

    res.json({ success: true, message: 'Password reset and emailed.', temporaryPassword: newPassword });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── BULK CREATE from CSV/Excel ──────────────────────────────
router.post('/bulk/create', protect, adminOnly, csvUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const results = [];
  const errors = [];
  const rows = [];

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.csv') {
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows.push(...XLSX.utils.sheet_to_json(sheet));
    }

    for (let i = 0; i < rows.length; i++) {
      const data = parseRowData(rows[i]);

      if (!data.studentId || !data.name || !data.email) {
        errors.push({ row: i + 2, studentId: data.studentId, reason: 'Missing required fields (Student ID, Name, Email)' });
        continue;
      }
      
      if (!data.dob) {
        errors.push({ row: i + 2, studentId: data.studentId, reason: 'Missing DOB' });
        continue;
      }

      try {
        const password = data.dob;
        const student = await User.create({ ...data, password, isFirstLogin: true, role: 'student' });
        results.push({ studentId: student.studentId, name: student.name, email: student.email });

        const { subject, html } = emailTemplates.accountCreated(
          student.name, student.studentId, password, process.env.CLIENT_URL + '/login'
        );
        sendEmail({ to: student.email, subject, html });
      } catch (e) {
        errors.push({ row: i + 2, studentId: data.studentId, reason: e.code === 11000 ? 'Duplicate ID or email' : e.message });
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      summary: { total: rows.length, created: results.length, failed: errors.length },
      created: results,
      errors
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── BULK UPDATE from CSV/Excel ──────────────────────────────
router.post('/bulk/update', protect, adminOnly, csvUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const results = [];
  const errors = [];
  const rows = [];

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.csv') {
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path).pipe(csv()).on('data', r => rows.push(r)).on('end', resolve).on('error', reject);
      });
    } else {
      const wb = XLSX.readFile(req.file.path);
      rows.push(...XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
    }

    for (let i = 0; i < rows.length; i++) {
      const data = parseRowData(rows[i]);
      if (!data.studentId) { errors.push({ row: i + 2, reason: 'Missing Student ID' }); continue; }

      const student = await User.findOne({ studentId: data.studentId, role: 'student' });
      if (!student) { errors.push({ row: i + 2, studentId: data.studentId, reason: 'Student not found' }); continue; }

      const updatableFields = ['cgpa', 'amcatScore', 'department', 'batch'];
      if (data.email) updatableFields.push('email');

      const changes = [];
      updatableFields.forEach(field => {
        const val = data[field];
        if (val !== undefined && val !== '' && !isNaN(field === 'cgpa' || field === 'amcatScore' ? val : 0)) {
          if (String(student[field]) !== String(val)) {
            changes.push({ field, oldValue: student[field], newValue: val });
            student[field] = val;
          }
        }
      });

      await student.save();
      if (changes.length > 0) {
        await AuditLog.create({ action: 'BULK_UPDATE', performedBy: req.user._id, targetUser: student._id, targetId: student.studentId, changes });
      }
      results.push({ studentId: student.studentId, fieldsUpdated: changes.length });
    }

    fs.unlinkSync(req.file.path);
    res.json({
      success: true,
      summary: { total: rows.length, updated: results.length, failed: errors.length },
      results, errors
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── UPLOAD resume (student) ────────────────────────────────
router.post('/me/resume', protect, studentOnly, resumeUpload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    await User.findByIdAndUpdate(req.user._id, { resume: req.file.path });
    res.json({ success: true, message: 'Resume uploaded.', path: req.file.path });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── UPDATE own profile (student) ───────────────────────────
router.put('/me/profile', protect, studentOnly, async (req, res) => {
  try {
    const allowed = ['phone', 'name'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f]) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
