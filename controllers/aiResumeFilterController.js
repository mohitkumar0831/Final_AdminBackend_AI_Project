import JD from "../models/jobDescription.js";
import Candidate from "../models/candidate.js";
import asyncHandler from "../utils/asyncHandler.js";
import { filterResumesWithAI } from "../utils/geminiAI.js";

// POST /api/jd/:jdId/filter-resumes
// Utility to ensure ObjectId
const cleanId = (val, jd) => {
  // AI sometimes returns email instead of ObjectId
  const byEmail = jd.appliedCandidates.find(c => c.email === val);
  if (byEmail) return byEmail.candidate._id.toString();

  return val; 
};


export const filterResumes = asyncHandler(async (req, res) => {
  let { jdId } = req.params;
  jdId = jdId.trim();
  
  const { candidateIds } = req.body;

  const jd = await JD.findById(jdId).populate("appliedCandidates.candidate");
  if (!jd) return res.status(404).json({ success: false, message: "JD not found" });

  const pendingCandidates = jd.appliedCandidates.filter((c) => {
    // treat legacy 'pending' and new 'applied' as pending for filtering
    const isPending = c.status === "pending" || c.status === "applied" || !c.status;
    
    if (candidateIds && candidateIds.length > 0) {
      return isPending && candidateIds.includes(c.candidate?._id.toString());
    }
    
    return isPending;
  });

  if (pendingCandidates.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "No pending candidates to filter" 
    });
  }

  console.log(`Filtering ${pendingCandidates.length} pending candidates out of ${jd.appliedCandidates.length} total`);

  const candidatesData = pendingCandidates.map((c) => ({
    id: c.candidate?._id.toString(),
    name: c.name,
    email: c.email,
    phone: c.phone,
    resume: c.resume,
    reallocate: c.reallocate || false,
  }));

  const aiResult = await filterResumesWithAI(jd, candidatesData);

  if (!aiResult.success) {
    return res.status(500).json({ success: false, error: aiResult.error });
  }

  // Emit and persist notifications for filtered/unfiltered candidates
  const io = req.app?.get?.('io');
  const Notification = (await import('../models/notification.js')).default;
  // Notify filtered candidates
  for (const filtered of aiResult.filtered) {
    const candidateId = cleanId(filtered.id, jd);
    const candidateObj = jd.appliedCandidates.find(c => c.candidate._id.toString() === candidateId);
    if (candidateObj) {
      const message = `You have been filtered for JD: ${jd.jobSummary || jd.title || jd.jobTitle}`;
      const link = `/jobs/${jd._id}`;
      if (io) io.to(candidateId).emit('notification', { message, link, createdAt: new Date() });
      await Notification.create({ recipient: candidateId, message, link });
    }
  }
  // Notify unfiltered candidates
  for (const unfiltered of aiResult.unfiltered) {
    const candidateId = cleanId(unfiltered.id, jd);
    const candidateObj = jd.appliedCandidates.find(c => c.candidate._id.toString() === candidateId);
    if (candidateObj) {
      const message = `You have been unfiltered for JD: ${jd.jobSummary || jd.title || jd.jobTitle}`;
      const link = `/jobs/${jd._id}`;
      if (io) io.to(candidateId).emit('notification', { message, link, createdAt: new Date() });
      await Notification.create({ recipient: candidateId, message, link });
    }
  }

  const existingFilteredCandidates = jd.filteredCandidates || [];
  const existingUnfilteredCandidates = jd.unfilteredCandidates || [];

  const newFilteredCandidates = aiResult.filtered.map((f) => ({
    candidate: cleanId(f.id, jd),
    aiScore: f.score,
    aiExplanation: f.explanation,
  }));

  const newUnfilteredCandidates = aiResult.unfiltered.map((f) => ({
    candidate: cleanId(f.id, jd),
    aiScore: f.score,
    aiExplanation: f.explanation,
  }));

  const existingFilteredIds = new Set(
    existingFilteredCandidates.map(c => c.candidate?.toString())
  );
  const existingUnfilteredIds = new Set(
    existingUnfilteredCandidates.map(c => c.candidate?.toString())
  );

  jd.filteredCandidates = [
    ...existingFilteredCandidates,
    ...newFilteredCandidates.filter(c => !existingFilteredIds.has(c.candidate?.toString()))
  ];

  jd.unfilteredCandidates = [
    ...existingUnfilteredCandidates,
    ...newUnfilteredCandidates.filter(c => !existingUnfilteredIds.has(c.candidate?.toString()))
  ];

  const newlyProcessedIds = new Set([
    ...aiResult.filtered.map((f) => cleanId(f.id, jd)),
    ...aiResult.unfiltered.map((u) => cleanId(u.id, jd)),
  ]);

  jd.appliedCandidates = jd.appliedCandidates.map((c) => {
    const id = c.candidate._id.toString();

    if (!newlyProcessedIds.has(id)) {
      return c;  
    }

    const filtered = aiResult.filtered.find((f) => cleanId(f.id, jd) === id);
    const unfiltered = aiResult.unfiltered.find((u) => cleanId(u.id, jd) === id);

    if (filtered) {
      return {
        ...c.toObject(),
        status: "filtered",
        aiScore: filtered.score,
        aiExplanation: filtered.explanation,
      };
    }

    if (unfiltered) {
      return {
        ...c.toObject(),
        status: "unfiltered",
        aiScore: unfiltered.score,
        aiExplanation: unfiltered.explanation,
      };
    }

    return c;
  });

  await jd.save();

  res.json({
    success: true,
    message: "AI resume filtering done",
    filtered: aiResult.filtered,
    unfiltered: aiResult.unfiltered,
    stats: {
      totalPending: pendingCandidates.length,
      newFiltered: aiResult.filtered.length,
      newUnfiltered: aiResult.unfiltered.length,
      totalFiltered: jd.filteredCandidates.length,
      totalUnfiltered: jd.unfilteredCandidates.length,
    }
  });
});








// import JD from "../models/jobDescription.js";
// import Candidate from "../models/candidate.js";
// import asyncHandler from "../utils/asyncHandler.js";
// import { filterResumesWithAI } from "../utils/geminiAI.js";

// // POST /api/jd/:jdId/filter-resumes
// export const filterResumes = asyncHandler(async (req, res, next) => {
//   const { jdId } = req.params;
//   const jd = await JD.findById(jdId).populate("appliedCandidates.candidate");
//   if (!jd) return res.status(404).json({ success: false, message: "JD not found" });
//   if (!jd.appliedCandidates || jd.appliedCandidates.length === 0) {
//     return res.status(400).json({ success: false, message: "No candidates to filter" });
//   }

//   // Prepare data for AI
//   const candidatesData = jd.appliedCandidates.map(c => ({
//     id: c.candidate._id,
//     name: c.name,
//     email: c.email,
//     phone: c.phone,
//     resume: c.resume,
//     reallocate: c.reallocate,
//   }));

//   // Call AI utility to filter resumes
//   const aiResult = await filterResumesWithAI(jd, candidatesData);
//   if (!aiResult.success) {
//     return res.status(500).json({ success: false, message: aiResult.error });
//   }

//   // Update JD with filtered/unfiltered candidates and explanations
//   jd.filteredCandidates = aiResult.filtered.map(f => ({
//     candidate: f.id,
//     aiScore: f.score,
//     aiExplanation: f.explanation,
//   }));
//   jd.unfilteredCandidates = aiResult.unfiltered.map(f => ({
//     candidate: f.id,
//     aiScore: f.score,
//     aiExplanation: f.explanation,
//   }));
//   // Update appliedCandidates status and explanations
//   jd.appliedCandidates = jd.appliedCandidates.map(c => {
//     const filtered = aiResult.filtered.find(f => f.id.toString() === c.candidate._id.toString());
//     const unfiltered = aiResult.unfiltered.find(f => f.id.toString() === c.candidate._id.toString());
//     if (filtered) {
//       return { ...c.toObject(), status: "filtered", aiScore: filtered.score, aiExplanation: filtered.explanation };
//     } else if (unfiltered) {
//       return { ...c.toObject(), status: "unfiltered", aiScore: unfiltered.score, aiExplanation: unfiltered.explanation };
//     }
//     return c;
//   });
//   await jd.save();
//   res.json({ success: true, filtered: aiResult.filtered, unfiltered: aiResult.unfiltered });
// });
