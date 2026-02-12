import mongoose from "mongoose";
 
const jdSchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
    },
 
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // HR
      required: true,
    },
 
    jobSummary: {
      type: String,
      required: true,
    },
 
    responsibilities: {
      type: [String],
      required: true,
    },
 
    requirements: {
      type: [String],
      required: true,
    },
 
    benefits: {
      type: [String],
      default: [],
    },
 
    additionalNotes: {
      type: String,
      default: "",
    },

    // New fields for AI-generated JD
    generatedByAI: {
      type: Boolean,
      default: false,
    },

    companyName: {
      type: String,
      default: "",
    },

    // department: {
    //   type: String,
    //   default: "",
    // },

    // reportingManager: {
    //   type: String,
    //   default: "",
    // },

    keyResponsibilities: {
      type: String,
      default: "",
    },

    requiredQualifications: {
      type: String,
      default: "",
    },

    additionalInfo: {
      type: String,
      default: "",
    },

    aiGenerationDetails: {
      generatedAt: {
        type: Date,
        default: null,
      },
      rawAIResponse: {
        type: String,
        default: "",
      },
    },

    // Unique public token for JD link
    publicToken: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Candidate application and filtering fields
    appliedCandidates: [
      {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
        resume: String,
        name: String,
        email: String,
        phone: String,
        reallocate: { type: Boolean, default: false },
        appliedAt: { type: Date, default: Date.now },
        // status values: pending/filtered/unfiltered (legacy),
        // applied: newly applied and eligible for invite,
        // link_sent: invite/link already sent,
        // completed: candidate completed the exam
        status: {
          type: String,
          enum: ["pending", "filtered", "unfiltered", "applied", "link_sent", "completed"],
          default: "applied",
        },
        aiScore: Number,
        aiExplanation: String,
        invitedAt: { type: Date, default: null },
        // Mail status tracking to prevent duplicate sends
        mailStatus: {
          type: String,
          enum: ["not_sent", "sent", "failed", "bounced"],
          default: "not_sent",
        },
        // Timestamp when invite email was sent
        mailSentAt: { type: Date, default: null },
        // Timestamp when candidate completed the test
        testCompletedAt: { type: Date, default: null },
      },
    ],
    filteredCandidates: [
      {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
        aiScore: Number,
        aiExplanation: String,
      },
    ],
    unfilteredCandidates: [
      {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
        aiScore: Number,
        aiExplanation: String,
      },
    ],
    // timestamp when invites were last sent for this JD
    lastInviteAt: { type: Date, default: null },
  },
  { timestamps: true }
);
 
export default mongoose.model("JD", jdSchema);