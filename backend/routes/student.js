/**
 * Student Panel - protected routes (profile, result, fees)
 */

const express = require('express');
const router = express.Router();
const { verify } = require('../utils/studentAuth');
const Student = require('../models/Student');
const StudentResult = require('../models/StudentResult');
const StudentFee = require('../models/StudentFee');

const getStudentId = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token || req.body?.token;
  const payload = verify(token);
  return payload && payload.studentId ? payload.studentId : null;
};

// GET /api/student/me - profile
router.get('/me', async (req, res) => {
  const studentId = getStudentId(req);
  if (!studentId) {
    return res.status(401).json({ success: false, message: 'लॉगिन जरूरी है।' });
  }
  try {
    const student = await Student.findById(studentId).select('name class rollNo createdAt');
    if (!student) return res.status(404).json({ success: false, message: 'छात्र नहीं मिला।' });
    res.json({ success: true, data: student });
  } catch (err) {
    console.error('Student me error:', err);
    res.status(500).json({ success: false, message: 'त्रुटि।' });
  }
});

// GET /api/student/result - my results
router.get('/result', async (req, res) => {
  const studentId = getStudentId(req);
  if (!studentId) return res.status(401).json({ success: false, message: 'लॉगिन जरूरी है।' });
  try {
    const results = await StudentResult.find({ student: studentId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Student result error:', err);
    res.status(500).json({ success: false, message: 'परिणाम लोड नहीं हो सके।' });
  }
});

// GET /api/student/fees - my fees
router.get('/fees', async (req, res) => {
  const studentId = getStudentId(req);
  if (!studentId) return res.status(401).json({ success: false, message: 'लॉगिन जरूरी है।' });
  try {
    const fees = await StudentFee.find({ student: studentId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: fees });
  } catch (err) {
    console.error('Student fees error:', err);
    res.status(500).json({ success: false, message: 'फीस लोड नहीं हो सके।' });
  }
});

// ---------- Admin: list students, add result, add fee ----------
// GET /api/student/list - list all students (for admin dropdown)
router.get('/list', async (req, res) => {
  try {
    const list = await Student.find().select('name class rollNo').sort({ class: 1, rollNo: 1 }).lean();
    const data = list.map(s => ({ id: s._id, name: s.name, class: s.class, rollNo: s.rollNo }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('Student list error:', err);
    res.status(500).json({ success: false, message: 'छात्र सूची लोड नहीं हो सकी।' });
  }
});

// POST /api/student/add-result - admin: add result for a student
router.post('/add-result', async (req, res) => {
  try {
    const { studentId, examName, session, totalMarks, obtainedMarks, percentage, grade, subjects, remarks } = req.body;
    if (!studentId || !examName) {
      return res.status(400).json({ success: false, message: 'छात्र और परीक्षा का नाम जरूरी है।' });
    }
    const result = new StudentResult({
      student: studentId,
      examName,
      session: session || '',
      totalMarks: totalMarks != null ? totalMarks : undefined,
      obtainedMarks: obtainedMarks != null ? obtainedMarks : undefined,
      percentage: percentage != null ? percentage : undefined,
      grade: grade || '',
      subjects: Array.isArray(subjects) ? subjects : [],
      remarks: remarks || ''
    });
    await result.save();
    res.status(201).json({ success: true, message: 'परिणाम जोड़ा गया।', data: result });
  } catch (err) {
    console.error('Add result error:', err);
    res.status(500).json({ success: false, message: 'परिणाम जोड़ने में त्रुटि।' });
  }
});

// POST /api/student/add-fee - admin: add fee record for a student
router.post('/add-fee', async (req, res) => {
  try {
    const { studentId, amount, paid, dueDate, session, description } = req.body;
    if (!studentId || amount == null) {
      return res.status(400).json({ success: false, message: 'छात्र और राशि जरूरी है।' });
    }
    const p = Number(paid) || 0;
    const a = Number(amount) || 0;
    let status = 'pending';
    if (p >= a) status = 'paid';
    else if (p > 0) status = 'partial';
    const fee = new StudentFee({
      student: studentId,
      amount: a,
      paid: p,
      dueDate: dueDate || undefined,
      session: session || '',
      description: description || 'फीस',
      status
    });
    await fee.save();
    res.status(201).json({ success: true, message: 'फीस रिकॉर्ड जोड़ा गया।', data: fee });
  } catch (err) {
    console.error('Add fee error:', err);
    res.status(500).json({ success: false, message: 'फीस जोड़ने में त्रुटि।' });
  }
});

module.exports = router;
