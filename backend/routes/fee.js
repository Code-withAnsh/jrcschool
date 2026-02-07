/**
 * Fee Routes
 * Handles fee-related queries and calculations
 */

const express = require('express');
const router = express.Router();

// Fee structure (can be moved to database in production)
const FEE_STRUCTURE = {
  nursery: { base: 15000, name: 'Nursery - UKG' },
  primary: { base: 17000, name: 'Class 1 - 5' },
  middle: { base: 19500, name: 'Class 6 - 8' },
  high: { base: 22000, name: 'Class 9 - 10' },
  senior: { base: 25000, name: 'Class 11 - 12' }
};

const TRANSPORT_FEES = {
  no: 0,
  near: 4000,
  far: 6000
};

/**
 * GET /api/fees/structure
 * Get fee structure
 */
router.get('/structure', (req, res) => {
  res.json({
    success: true,
    data: {
      baseFees: FEE_STRUCTURE,
      transportFees: TRANSPORT_FEES,
      additionalCharges: {
        examination: 'As per schedule',
        activity: 'As per activities',
        uniform: 'Separate purchase',
        books: 'Separate purchase'
      }
    }
  });
});

/**
 * POST /api/fees/calculate
 * Calculate fee based on class and transport
 */
router.post('/calculate', (req, res) => {
  try {
    const { class: classType, transport = 'no' } = req.body;

    if (!classType || !FEE_STRUCTURE[classType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid class selection'
      });
    }

    const baseFee = FEE_STRUCTURE[classType].base;
    const transportFee = TRANSPORT_FEES[transport] || 0;
    const total = baseFee + transportFee;

    res.json({
      success: true,
      data: {
        class: FEE_STRUCTURE[classType].name,
        baseFee,
        transportFee,
        total,
        breakdown: {
          tuition: baseFee * 0.85,
          otherCharges: baseFee * 0.15,
          transport: transportFee
        }
      }
    });
  } catch (error) {
    console.error('Fee calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate fee'
    });
  }
});

module.exports = router;
