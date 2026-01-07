import Candidate from '../models/candidate.js';
import { resetPasswordTemplate } from '../utils/emailTemplates/resetPasswordTemplate.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Request OTP for password reset (Candidate)
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  const candidate = await Candidate.findOne({ email });
  if (!candidate) return res.status(404).json({ message: 'Candidate not found.' });

  const otp = generateOTP();
  const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  candidate.resetPasswordOTP = otp;
  candidate.resetPasswordOTPExpiry = otpExpiry;
  await candidate.save();

  const html = resetPasswordTemplate({
    name: candidate.name,
    otp
  });

  await sendEmail({
    to: candidate.email,
    subject: 'Password Reset OTP',
    html,
  });

  res.status(200).json({ message: 'OTP sent to your email.' });
};

// OTP validation controller (Candidate)
export const validateOTP = async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }
  const candidate = await Candidate.findOne({ email });
  if (!candidate || candidate.resetPasswordOTP !== otp || candidate.resetPasswordOTPExpiry < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP.' });
  }
  res.status(200).json({ message: 'OTP is valid.' });
};

// Password change controller (after OTP validation, Candidate)
export const changePassword = async (req, res, next) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Email and new password are required.' });
  }
  const candidate = await Candidate.findOne({ email }).select('+password');
  if (!candidate || !candidate.resetPasswordOTP || !candidate.resetPasswordOTPExpiry || candidate.resetPasswordOTPExpiry < Date.now()) {
    return res.status(400).json({ message: 'OTP expired or not requested.' });
  }
  candidate.password = newPassword;
  candidate.resetPasswordOTP = undefined;
  candidate.resetPasswordOTPExpiry = undefined;
  await candidate.save();
  res.status(200).json({ message: 'Password changed successfully.' });
};
