const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const recruitmentSchema = new Schema(
  {
    applicationId: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    department: { type: String, default: "" },
    skills: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    role: { type: String, default: "" },
    message: { type: String, maxlength: 1000, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recruitment", recruitmentSchema);
