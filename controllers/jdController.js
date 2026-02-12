import candidate from "../models/candidate.js";
import JD from "../models/jobDescription.js";
import Offer from "../models/Offer.js";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/errorResponse.js";
import { generateJDWithAI } from "../utils/geminiAI.js";
import { generateUniqueToken } from "../utils/generateToken.js";
 
// -------------------------------------------
// HR Creates JD Manually  // -------------------------------------------
export const createJD = asyncHandler(async (req, res, next) => {
  const { offerId } = req.params;
  const { jobSummary, responsibilities, requirements, benefits, additionalNotes } = req.body;
 
  // Validate offer exists
  const offer = await Offer.findById(offerId);
    if (!offer) return next(new ErrorResponse("Offer not found", 404));
 
  // Only assigned HR can create JD
  if (offer.assignedTo.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse("Not authorized to create JD for this offer.", 403));
  }
 
  const jd = await JD.create({
    offerId,
    createdBy: req.user._id,
    jobSummary,
    responsibilities,
    requirements,
    benefits,
    additionalNotes,
    generatedByAI: false,
    isJDCreated:true,
    publicToken: generateUniqueToken(16),
  });
 
  // Update offer status
  offer.status = "JD created";
  await offer.save();

  // Notify RMG (offer creator)
  const Notification = (await import('../models/notification.js')).default;
  const rmgNotification = await Notification.create({
    recipient: offer.createdBy,
    message: `JD created for your offer: ${offer.jobTitle}`,
    link: `/offers/${offer._id}`
  });
  const io = req.app.get('io');
  if (io) {
    io.to(offer.createdBy.toString()).emit('notification', rmgNotification);
  }

  res.status(201).json({
    success: true,
    message: "JD created successfully.",
    jd,
  });
});

// -------------------------------------------
// HR Creates JD with AI Assistance
// -------------------------------------------
export const createJDWithAI = asyncHandler(async (req, res, next) => {
  const { offerId } = req.params;
  const { 
    companyName, 
    // department, 
    // reportingManager, 
    keyResponsibilities, 
    qualifications, 
    benefits: additionalBenefits, 
    additionalNotes 
  } = req.body;

  // Validate offer exists
  const offer = await Offer.findById(offerId);
  if (!offer) return next(new ErrorResponse("Offer not found", 404));

  // Only assigned HR can create JD
  if (offer.assignedTo.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse("Not authorized to create JD for this offer.", 403));
  }

  if (offer.isJDCreated) {
    return next(new ErrorResponse("JD already created for this offer", 400));
  }

  // Prepare additional details from HR
  const additionalDetails = {
    companyName,
    // department,
    // reportingManager,
    keyResponsibilities,
    qualifications,
    benefits: additionalBenefits,
    additionalNotes,
  };

  // Generate JD using Gemini AI
  const aiResult = await generateJDWithAI(offer.toObject(), additionalDetails);

  if (!aiResult.success) {
    return next(new ErrorResponse(`AI Generation failed: ${aiResult.error}`, 500));
  }

  const { jobSummary, responsibilities, requirements, benefits, additionalInfo } = aiResult.data;

  // Create JD with AI-generated content
  const jd = await JD.create({
    offerId,
    createdBy: req.user._id,
    jobSummary,
    responsibilities,
    requirements: requirements || [],
    benefits: benefits || [],
    additionalNotes: additionalNotes || "",
    generatedByAI: true,
    companyName,
    // department,
    // reportingManager,
    keyResponsibilities,
    requiredQualifications: qualifications,
    additionalInfo,
    aiGenerationDetails: {
      generatedAt: new Date(),
      rawAIResponse: aiResult.raw,
    },
    publicToken: generateUniqueToken(16),
  });

  // ✅ Update offer status AND isJDCreated
  offer.status = "JD created";
  offer.isJDCreated = true; 
  await offer.save();

  // Notify RMG (offer creator)
  const Notification = (await import('../models/notification.js')).default;
  const rmgNotification = await Notification.create({
    recipient: offer.createdBy,
    message: `JD created for your offer: ${offer.jobTitle}`,
    link: `/offers/${offer._id}`
  });
  const io = req.app.get('io');
  if (io) {
    io.to(offer.createdBy.toString()).emit('notification', rmgNotification);
  }

  res.status(201).json({
    success: true,
    message: "JD created successfully using AI.",
    jd,
    aiGenerated: true,
  });
});

  // export const getAllJds = asyncHandler(async (req, res, next) => {
  //   const jds = await JD.find().populate('offerId').populate('createdBy', 'name email');
  //   res.status(200).json({ success: true, count: jds.length, data: jds });
  // });

export const getAllJds = asyncHandler(async (req, res, next) => {
  const now = new Date();
  // Aggregate to join JD and Offer, filter by offer.dueDate
  const jds = await JD.aggregate([
    {
      $lookup: {
        from: 'offers',
        localField: 'offerId',
        foreignField: '_id',
        as: 'offerObj'
      }
    },
    { $unwind: '$offerObj' },
    { $match: { 'offerObj.dueDate': { $gte: now } } },
  ]);

  // Populate createdBy for each JD
  const populatedJds = await JD.populate(jds, [
    { path: 'createdBy', select: 'name email' },
    { path: 'offerId' }
  ]);

  res.status(200).json({ success: true, count: populatedJds.length, data: populatedJds });
});

export const getAllJDs = asyncHandler(async (req, res, next) => {
  const now = new Date();
  // Aggregate to join JD and Offer, filter by offer.dueDate
  const jds = await JD.aggregate([
    {
      $lookup: {
        from: 'offers',
        localField: 'offerId',
        foreignField: '_id',
        as: 'offerObj'
      }
    },
    { $unwind: '$offerObj' },
    { $match: { 'offerObj.dueDate': { $gte: now } } },
  ]);

  // Populate createdBy for each JD
  const populatedJds = await JD.populate(jds, [
    { path: 'createdBy', select: 'name email' },
    { path: 'offerId' }
  ]);

  res.status(200).json({ success: true, count: populatedJds.length, data: populatedJds });
});


export const addresumeToJD = asyncHandler(async (req, res, next) => {
  const { jdId } = req.params;
  const { candidateId, name, email, phone, resume, reallocate } = req.body;
  const jd = await JD.findById(jdId);
  if (!jd) return next(new ErrorResponse("JD not found", 404));
  jd.appliedCandidates.push({
    candidate: candidateId,
    name,
    email,
    phone,
    resume,
    reallocate,
  });
  await jd.save();
  res.status(200).json({ success: true, message: "Resume added to JD successfully.", jd });
});

export const getAllCandidates = asyncHandler(async (req, res, next) => {
  const Candidate = await candidate.find();
  //check that each candidate have the resume 
  

  res.status(200).json({ success: true, count: Candidate.length, data: Candidate });
});

// Get only filtered candidates for a JD
export const getFilteredCandidatesForJD = asyncHandler(async (req, res, next) => {
  const { jdId } = req.params;
  const jd = await JD.findById(jdId).populate('filteredCandidates.candidate', 'name email phone resume');
  if (!jd) return next(new ErrorResponse("JD not found", 404));
  res.status(200).json({
    success: true,
    count: jd.filteredCandidates.length,
    data: jd.filteredCandidates
  });
});

export const getAllCandidatesAppliedToJD = asyncHandler(async (req, res, next) => {
  const { jdId } = req.params;
  const { includeInvited } = req.query; // Optional query param to include already invited candidates
  
  const jd = await JD.findById(jdId).populate('appliedCandidates.candidate', 'name email phone resume');
  if (!jd) return next(new ErrorResponse("JD not found", 404));
  
  // Filter candidates based on mail status and test completion
  let filteredCandidates = jd.appliedCandidates;
  
  if (!includeInvited || includeInvited === 'false') {
    // Exclude candidates who:
    // 1. Have mailStatus === 'sent' (already received invite)
    // 2. Have testCompletedAt (already completed the test)
    filteredCandidates = jd.appliedCandidates.filter(ac => {
      return ac.mailStatus !== 'sent' && !ac.testCompletedAt;
    });
  }
  
  res.status(200).json({ 
    success: true, 
    count: filteredCandidates.length, 
    totalCount: jd.appliedCandidates.length,
    message: `Showing ${filteredCandidates.length} of ${jd.appliedCandidates.length} candidates`,
    data: filteredCandidates 
  });
});

export const getAssignedJDsByRMG = asyncHandler(async (req, res, next) => {
  const jds = await JD.find({ createdBy: req.user._id })
    .populate('offerId')
    .populate('createdBy', 'name email');
  res.status(200).json({ success: true, count: jds.length, data: jds });
});

export const getAssignedOffersByRMG = asyncHandler(async (req, res, next) => {
  const offers = await Offer.find({ assignedTo: req.user._id });
  res.status(200).json({ success: true, count: offers.length, data: offers });
});

export const getJdCreatedByHR = asyncHandler(async (req, res, next) => {
  const jds = await JD.find({ createdBy: req.user._id })
    .populate('offerId')
    .populate('createdBy', 'name email');
  res.status(200).json({ success: true, count: jds.length, data: jds });
});


/// 
export const editJD = asyncHandler(async (req, res, next) => {
  const { jdId } = req.params;
  const updateFields = req.body;

  // Find JD by ID
  const jd = await JD.findById(jdId);
  if (!jd) return next(new ErrorResponse("JD not found", 404));

  // Optionally: Only allow the creator or assigned HR to edit
  // if (jd.createdBy.toString() !== req.user._id.toString()) {
  //   return next(new ErrorResponse("Not authorized to edit this JD", 403));
  // }

  // Update only provided fields
  Object.keys(updateFields).forEach((key) => {
    jd[key] = updateFields[key];
  });

  await jd.save();

  res.status(200).json({
    success: true,
    message: "JD updated successfully.",
    jd,
  });
});