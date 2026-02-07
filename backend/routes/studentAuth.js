/**
 * Student Auth - Register & Login
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Student = require('../models/Student');
const { sign } = require('../utils/studentAuth');

const classEnum = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// POST /api/student/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('नाम जरूरी है').isLength({ max: 100 }),
  body('class').trim().notEmpty().withMessage('कक्षा जरूरी है').isIn(classEnum),
  body('rollNo').trim().notEmpty().withMessage('रोल नंबर जरूरी है'),
  body('password').isLength({ min: 6 }).withMessage('पासवर्ड कम से कम 6 अक्षर का होना चाहिए'),
  body('confirmPassword').custom((val, { req }) => val === req.body.password || Promise.reject('पासवर्ड मेल नहीं खाते'))
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }
    const { name, class: cls, rollNo, password } = req.body;
    const existing = await Student.findOne({ class: cls, rollNo: String(rollNo).trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'इस कक्षा में यह रोल नंबर पहले से रजिस्टर है।' });
    }
    const student = new Student({ name: name.trim(), class: cls, rollNo: String(rollNo).trim() });
    student.setPassword(password);
    await student.save();
    const token = sign({ studentId: student._id.toString() });
    return res.status(201).json({
      success: true,
      message: 'खाता बन गया। अब लॉगिन करें।',
      token,
      student: { id: student._id, name: student.name, class: student.class, rollNo: student.rollNo }
    });
  } catch (err) {
    console.error('Student register error:', err);
    res.status(500).json({ success: false, message: 'रजिस्ट्रेशन में त्रुटि।' });
  }
});

// POST /api/student/login
router.post('/login', [
  body('class').trim().notEmpty().withMessage('कक्षा जरूरी है'),
  body('rollNo').trim().notEmpty().withMessage('रोल नंबर जरूरी है'),
  body('password').notEmpty().withMessage('पासवर्ड जरूरी है')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { class: cls, rollNo, password } = req.body;
    const student = await Student.findOne({ class: cls, rollNo: String(rollNo).trim() });
    if (!student || !student.verifyPassword(password)) {
      return res.status(401).json({ success: false, message: 'गलत कक्षा, रोल नंबर या पासवर्ड।' });
    }
    const token = sign({ studentId: student._id.toString() });
    return res.json({
      success: true,
      token,
      student: { id: student._id, name: student.name, class: student.class, rollNo: student.rollNo }
    });
  } catch (err) {
    console.error('Student login error:', err);
    res.status(500).json({ success: false, message: 'लॉगिन में त्रुटि।' });
  }
});

module.exports = router;
