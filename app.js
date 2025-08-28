require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const crypto = require("crypto");

const Recruitment = require("./models/recruitment");

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// -----------------------------
// Validate Mongo URI
// -----------------------------
if (!MONGO_URI) {
  console.error("❌ Error: MONGO_URI environment variable is not defined.");
  console.error("Please set it in your .env file or container environment.");
  process.exit(1);
}

// -----------------------------
// Connect to MongoDB
// -----------------------------
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// -----------------------------
// View engine
// -----------------------------
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// -----------------------------
// Middleware
// -----------------------------
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------
// Routes
// -----------------------------

// Home
app.get("/", (req, res) => res.render("home/home"));

// Show recruitment form
app.get("/recruitment/apply", (req, res) => res.render("recruitment/recruitment"));

// Handle submission (create applicant + generate app ID)
app.post("/recruitment", async (req, res) => {
  try {
    const { name, email, department, skills, interests, role, message } = req.body;

    // create compact application id: MLRN + random 6 hex + time slice
    const rnd = crypto.randomBytes(3).toString("hex").toUpperCase();
    const timeSlice = Date.now().toString().slice(-5);
    const applicationId = `MLRN${rnd}${timeSlice}`;

    const applicant = new Recruitment({
      applicationId,
      name,
      email,
      department: department || "",
      skills: skills ? skills.split(",").map(s => s.trim()).filter(Boolean) : [],
      interests: interests ? interests.split(",").map(i => i.trim()).filter(Boolean) : [],
      role: role || "",
      message: message || ""
    });

    await applicant.save();
    res.render("recruitment/success", { applicationId });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(400).send("Error submitting application. Maybe email already used.");
  }
});

// Status check form
app.get("/check-status", (req, res) => {
  res.render("recruitment/checkStatus", { status: null, applicant: null, error: null });
});
app.post("/check-status", async (req, res) => {
  const { applicationId } = req.body;
  try {
    const applicant = await Recruitment.findOne({ applicationId: applicationId.trim() });
    if (!applicant) {
      return res.render("recruitment/checkStatus", { status: null, applicant: null, error: "Invalid Application ID" });
    }
    res.render("recruitment/checkStatus", { status: applicant.status, applicant, error: null });
  } catch (err) {
    console.error(err);
    res.render("recruitment/checkStatus", { status: null, applicant: null, error: "Something went wrong" });
  }
});

// -----------------------------
// Admin routes (no auth for now)
// -----------------------------

// Admin applicants list
app.get("/admin/applicants", async (req, res) => {
  try {
    const applicants = await Recruitment.find().sort({ appliedAt: -1 });
    res.render("admin/adminApplicants", { applicants });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Update status (Accept / Reject / Pending)
app.post("/admin/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Accepted", "Rejected", "Pending"].includes(status)) {
      return res.status(400).send("Invalid status");
    }
    await Recruitment.findByIdAndUpdate(req.params.id, { status });
    res.redirect("/admin/applicants");
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Public applicants list (read-only)
app.get("/recruitment/applicants", async (req, res) => {
  try {
    const applicants = await Recruitment.find().sort({ appliedAt: -1 });
    res.render("recruitment/applicants", { applicants });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
