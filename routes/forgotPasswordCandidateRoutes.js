import express from 'express';
import {
  forgotPassword,
  validateOTP,
  changePassword
} from '../controllers/candidateForgotPasswordController.js';

const router = express.Router();

// Request OTP for password reset
router.post('/forgot', forgotPassword);

// Validate OTP
router.post('/validate-otp', validateOTP);

// Change password after OTP validation
router.post('/change-password', changePassword);

export default router;
