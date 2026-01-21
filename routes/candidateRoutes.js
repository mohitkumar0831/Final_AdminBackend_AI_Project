import { getCandidateProfile, updateCandidateProfile } from "../controllers/candidateController.js";
// Candidate profile routes
import express from "express";
import {getCandidateById, sendBulkJDInvite, registerCandidate, loginCandidate, applyJob, getAppliedJobs, getCandidateJdCounts, showlatestFiveJdsForCandidate, getAppliedjd, getCandidateResume, sendInviteToShortlisted} from "../controllers/candidateController.js";
// import { registerCandidate, loginCandidate, applyJob, getAppliedJobs} from "../controllers/candidateController.js";
import { protect } from "../middlewares/auth.js";
import { protectCandidate } from "../middlewares/authCandidate.js";
import multer from "multer";

const router = express.Router();
const upload = multer();

router.post("/register", upload.single("resume"), registerCandidate);
router.post("/login", loginCandidate);
router.post("/apply/:jdId", upload.single("resume"), applyJob);
router.get("/profile/me", protectCandidate, getCandidateProfile);
router.put("/profile/me", protectCandidate, upload.single("resume"), updateCandidateProfile);
router.get("/applied-jobs", protectCandidate, getAppliedJobs);
router.get("/jd-counts", protectCandidate, getCandidateJdCounts);
router.get("/latest-five-jds", protectCandidate, showlatestFiveJdsForCandidate);
router.get("/applied-jds", protectCandidate, getAppliedjd);
router.post("/send-email/:jdId", protect, sendBulkJDInvite);
router.post("/send-email-shortlisted/:jdId", protect, sendInviteToShortlisted);
// Get candidate by id (protected)

router.get("/resume", protectCandidate, getCandidateResume);
router.get("/:id", protect, getCandidateById);

// Public candidate lookup (no auth) - safe to expose basic non-sensitive fields
router.get("/public/:id", getCandidateById);

export default router;
