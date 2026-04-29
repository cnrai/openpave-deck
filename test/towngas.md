@title: Above-Ground Installation Quality AI Verification System
@client: Towngas
@contact-name: Anne So, Chief Strategy Officer
@contact-email: anne.so@candrholdings.com

# =============================================================================
# Source: Towngas Above-Ground Installation Quality AI Verification System (PoC).paper
#         v2.0 · 13 April 2026 · prepared by C&R Wise AI Limited
# Rule: stay true to the paper. Don't add. Don't invent.
# Order follows paper sections §1 → §11.
# Only PAVE-themed slide is §1.2 PAVE Studio (the one PAVE-specific mention).
# =============================================================================

# -----------------------------------------------------------------------------
# 1. Title (paper cover)
# -----------------------------------------------------------------------------
::: slide type=title
title: Above-Ground Installation<br/>Quality <em>AI Verification</em>
tagline: Proof-of-Concept Proposal · v2.0
meta-tags:
  - C&R Wise AI Limited
  - 13 April 2026
  - Customer Installation Services
:::

# -----------------------------------------------------------------------------
# 2. Executive Summary (§1)
# -----------------------------------------------------------------------------
::: slide type=split
kicker: Executive Summary
title: AI-Powered <em>Visual Verification</em> for Above-Ground Pipe Installations
body: Contractors upload installation photos to designated OneDrive folders. Towngas staff initiate AI verification through an admin dashboard — Pass/Fail results with confidence scores and flagged issues.
bullets:
  - <strong>Pilot scope</strong> — Exhaust Pipe + Pipe Joint + Basic Anti-Fraud
  - <strong>Timeline</strong> — 8–10 weeks for POC
  - <strong>Technology</strong> — VLM AI + OneDrive Integration
  - <strong>Deployment</strong> — OneDrive upload + admin dashboard with manual scan trigger
variant: blue
big-number: 200k
big-icon: hk-dollar-sign
big-label: HKD · Phase 1 total
:::

# -----------------------------------------------------------------------------
# 3. Solution Overview — 5 modules (§1.1 table)
# -----------------------------------------------------------------------------
::: slide type=feature-grid
kicker: Solution Overview
title: Five <em>Verification Modules</em>
intro: Three modules ship in the POC; two are roadmap for Phase 2. All powered by Visual-Language Model AI.
items:
  - icon: fire
    title: Exhaust Pipe (熱水爐煙道)
    body: Water heater exhaust pipe installation — object detection, position analysis.
    accent: blue
  - icon: link
    title: Pipe Joint (混合鋼膠)
    body: Jointing compound application at pipe joints — defect detection, coverage analysis.
    accent: accent
  - icon: shield-halved
    title: Basic Anti-Fraud (基礎防欺詐檢測)
    body: Detect duplicate photos and suspicious submissions — file hashing, metadata, image similarity.
    accent: blue
  - icon: helmet-safety
    title: Safety Compliance (Phase 2)
    body: Helmet, safety belt, certificate validity — object detection, OCR, date validation.
    accent: light
  - icon: users
    title: Training Attendance (Phase 2)
    body: Attendee facial recognition in training videos — face recognition, attendance tracking.
    accent: light
:::

# -----------------------------------------------------------------------------
# 4. PAVE Studio (§1.2) — the only paper-sanctioned PAVE-themed slide
# -----------------------------------------------------------------------------
::: slide type=pave-divider
kicker: Development Approach
title: Powered by <span class="accent-text">PAVE Studio</span>
body: C&R's AI-enabled development platform — accelerates application delivery through rapid prototyping, custom vision-model training on Towngas-specific photos, and enterprise-grade production deployment.
bg-image: https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80
bg-opacity: 0.5
:::

# -----------------------------------------------------------------------------
# 5. Business Objectives (§2)
# -----------------------------------------------------------------------------
::: slide type=feature-grid
kicker: Business Objectives
title: What This System <em>Achieves</em>
items:
  - icon: shield-halved
    title: Quality Assurance
    body: Ensure installations meet standards before being concealed.
    accent: blue
  - icon: bolt
    title: Efficiency
    body: Reduce manual inspection time and site visits.
    accent: accent
  - icon: clipboard-check
    title: Compliance
    body: Create auditable records of installation verification.
    accent: blue
  - icon: arrows-up-down-left-right
    title: Scalability
    body: Enable verification across hundreds of construction sites.
    accent: accent
  - icon: magnifying-glass
    title: Fraud Prevention
    body: Detect and flag suspicious duplicate or reused photos.
    accent: blue
:::

# -----------------------------------------------------------------------------
# 6. End-to-End Workflow (§3.1) — 6 steps
# -----------------------------------------------------------------------------
::: slide type=process-steps
theme: cnr
kicker: End-to-End Workflow
title: From Upload to Result in Six Steps
intro: Contractor uploads to OneDrive. Towngas reviews, scans, and acts. C&R system handles sync and AI in between.
steps:
  - num: 01
    icon: folder-plus
    title: Create Folder
    duration: Contractor
    body: Create OneDrive folder following naming convention (e.g. Project_A/Flat_5A/).
  - num: 02
    icon: cloud-arrow-up
    title: Upload Photos
    duration: Contractor
    body: Upload installation photos with whiteboard to the folder.
  - num: 03
    icon: rotate
    title: Detect & Sync
    duration: System
    body: Detect new folders/files via Microsoft Graph API; sync to dashboard.
  - num: 04
    icon: eye
    title: View Synced
    duration: Towngas
    body: Towngas staff views synced folders and photos in admin dashboard.
  - num: 05
    icon: wand-magic-sparkles
    title: Press "Scan"
    duration: Towngas
    body: Manually trigger AI verification + anti-fraud checks for selected photos.
  - num: 06
    icon: chart-line
    title: Results Display
    duration: System
    body: AI processes photos; Pass/Fail results with flagged issues shown.
:::

# -----------------------------------------------------------------------------
# 7. UC1 — Exhaust Pipe Verification (§3.2 Use Case 1)
# -----------------------------------------------------------------------------
::: slide type=split
kicker: Use Case 1 · 熱水爐煙道
title: Water Heater <em>Exhaust Pipe</em> Verification
body: AI verifies that the exhaust pipe is present, properly connected, and free of visible defects. Pass/Fail with confidence score and flagged issues. Verification criteria — pipe present, connected, no gaps, correct angle/orientation.
bullets:
  - <strong>Photo Source</strong> — synced from contractor's OneDrive folder
  - <strong>Scan Trigger</strong> — Towngas presses "Scan" in dashboard
  - <strong>AI Analysis</strong> — detect exhaust pipe/chimney above heater
  - <strong>Position Check</strong> — verify pipe properly positioned and connected
  - <strong>Installation Quality</strong> — visible defects, gaps, misalignment
  - <strong>Inspection Record OCR</strong> — Project, Flat/Unit, Inspector, Date
  - <strong>Result</strong> — Pass/Fail with confidence + flagged issues
variant: blue
big-number: 7
big-icon: list-check
big-label: Checks per photo
:::

# -----------------------------------------------------------------------------
# 8. UC2 — Pipe Joint Verification (§3.2 Use Case 2)
# -----------------------------------------------------------------------------
::: slide type=split
kicker: Use Case 2 · 混合鋼膠
title: Pipe <em>Joint</em> Verification
body: AI verifies jointing compound is present, evenly applied, and properly squeezed. Pass/Fail with annotated image highlighting issues. Verification criteria — compound visible, even coverage, no gaps/dry spots, correct squeeze pattern.
bullets:
  - <strong>Photo Source</strong> — synced from contractor's OneDrive folder
  - <strong>Scan Trigger</strong> — Towngas presses "Scan" in dashboard
  - <strong>Compound Detection</strong> — detect jointing compound/sealant
  - <strong>Coverage Analysis</strong> — verify even application around joint
  - <strong>Application Quality</strong> — proper squeeze/spread pattern
  - <strong>Inspection Record OCR</strong> — Project, Flat/Unit, Inspector, Date
  - <strong>Result</strong> — Pass/Fail with annotated image
variant: blue
big-number: 7
big-icon: list-check
big-label: Checks per photo
:::

# -----------------------------------------------------------------------------
# 9. UC3 — Anti-Fraud Scenarios (§3.2 Use Case 3)
# -----------------------------------------------------------------------------
::: slide type=feature-grid
kicker: Use Case 3 · 基礎防欺詐檢測
title: Three Fraud Scenarios <em>Addressed</em>
intro: Anti-fraud runs automatically when Towngas triggers Scan — checking for suspicious photo submissions across the project.
items:
  - icon: clone
    title: A — Same Photo Reuse
    body: Contractor uploads the exact same photo file for different units/flats.
    accent: blue
  - icon: clock
    title: B — Rapid Submission
    body: Photos for different units taken within suspiciously short time (e.g. <5 minutes apart).
    accent: accent
  - icon: image
    title: C — Similar Photo Reuse
    body: Contractor uploads nearly identical photos (minor crop/resize) for different units.
    accent: blue
:::

# -----------------------------------------------------------------------------
# 10. Anti-Fraud Detection Methods (§3.2 UC3 detection features)
# -----------------------------------------------------------------------------
::: slide type=feature-grid
kicker: Detection Methods
title: How Each <em>Fraud Scenario</em> Is Caught
items:
  - icon: fingerprint
    title: 1. Duplicate File Detection
    body: SHA-256 hash of every upload, compared against all previous uploads. Catches exact same file uploaded for different units.
    accent: blue
  - icon: clock
    title: 2. EXIF Timestamp Analysis
    body: Extracts timestamp + device ID from EXIF. Flags when different-unit photos are <5 min apart from same device.
    accent: accent
  - icon: image
    title: 3. Basic Image Similarity
    body: Perceptual hashing (pHash) fingerprint per image. Detects visually similar images even with crop, resize, or compression.
    accent: blue
:::

# -----------------------------------------------------------------------------
# 11. Admin Dashboard Features (§3.3)
# -----------------------------------------------------------------------------
::: slide type=feature-grid
kicker: Admin Dashboard
title: What Towngas Staff <em>See and Do</em>
intro: Single web interface for the entire verification workflow — synced content, scan trigger, results, fraud review, audit trail.
items:
  - icon: folder-tree
    title: Folder & Gallery View
    body: All synced OneDrive folders organised by project/flat with photo gallery per folder.
    accent: blue
  - icon: wand-magic-sparkles
    title: Scan Button
    body: Trigger AI verification and anti-fraud checks for selected photos.
    accent: accent
  - icon: clipboard-check
    title: Results Display
    body: Pass/Fail status, confidence score, and flagged issues for each photo.
    accent: blue
  - icon: triangle-exclamation
    title: Fraud Alerts
    body: Flagged submissions with reason — duplicate, timestamp, or similarity.
    accent: accent
  - icon: images
    title: Photo Comparison
    body: Side-by-side view for fraud review, with Approve / Reject actions.
    accent: blue
  - icon: clock-rotate-left
    title: Audit Log
    body: History of all scans and fraud checks.
    accent: accent
:::

# -----------------------------------------------------------------------------
# 12. System Architecture (§4.1 components)
# -----------------------------------------------------------------------------
::: slide type=feature-grid
kicker: System Architecture
title: Six <em>Components</em>
items:
  - icon: cloud
    title: OneDrive Integration
    body: Microsoft Graph API — detect new folders/files, sync photos to system.
    accent: blue
  - icon: display
    title: Admin Dashboard
    body: React — view synced content, trigger scans, review results.
    accent: accent
  - icon: brain
    title: AI Verification Engine
    body: Visual Language Model — image analysis, defect detection, OCR.
    accent: blue
  - icon: shield-halved
    title: Anti-Fraud Module
    body: Hash + pHash + EXIF parser — duplicate detection, similarity matching.
    accent: accent
  - icon: server
    title: Backend Services
    body: Node.js / PostgreSQL — data management, workflow, audit logging.
    accent: blue
  - icon: graduation-cap
    title: Model Training
    body: C&R Custom Prompt Engineering — custom model training.
    accent: accent
:::

# -----------------------------------------------------------------------------
# 13. Timeline (§5.1) — 6 phases over 8–10 weeks
# -----------------------------------------------------------------------------
::: slide type=process-steps
theme: cnr
kicker: Timeline · 8–10 Weeks
title: Six Phases to <em>Pilot Deployment</em>
steps:
  - num: 01
    icon: magnifying-glass
    title: Discovery
    duration: 1 week
    body: Requirements finalisation, sample data collection, OneDrive folder structure design.
  - num: 02
    icon: brain
    title: AI Model Development
    duration: 3 weeks
    body: Verification models, prompt engineering, validation.
  - num: 03
    icon: shield-halved
    title: Anti-Fraud Module
    duration: 1–1.5 weeks
    body: Hash comparison, EXIF parsing, pHash similarity.
  - num: 04
    icon: cloud
    title: OneDrive + Dashboard
    duration: 2–3 weeks
    body: OneDrive API sync + admin dashboard with scan trigger.
  - num: 05
    icon: vial
    title: Integration & Testing
    duration: 1–2 weeks
    body: End-to-end testing, fraud detection testing, UAT.
  - num: 06
    icon: rocket
    title: Pilot Deployment
    duration: 1 week
    body: Field testing at selected sites.
:::

# -----------------------------------------------------------------------------
# 14. Investment — Phase 1 (§6.1)
# -----------------------------------------------------------------------------
::: slide type=pricing-table
kicker: Investment · Phase 1 (POC)
title: HKD <em>200,000</em> · Verification + Basic Anti-Fraud
intro: Ballpark estimates for budgeting. Final pricing confirmed after Discovery.
rows:
  - label: Discovery & Planning
    value: HKD 12,000
    note: Requirements, data collection, folder structure design
  - label: AI Model Development — Verification
    value: HKD 58,000
    note: VLM models for Exhaust Pipe + Pipe Joint
  - label: Basic Anti-Fraud Module
    value: HKD 15,000
    note: SHA-256 + EXIF + perceptual hash similarity
  - label: OneDrive Integration
    value: HKD 25,000
    note: Microsoft Graph API integration, folder/file sync
  - label: Admin Dashboard
    value: HKD 45,000
    note: Synced content, scan trigger, results display, fraud alerts
  - label: Integration & Testing
    value: HKD 18,000
    note: End-to-end testing, UAT support
  - label: Contingency
    value: HKD 27,000
    note: Buffer for adjustments
  - label: Phase 1 Total
    value: HKD 200,000
    note: All-inclusive POC budget
:::

# -----------------------------------------------------------------------------
# 15. Phase 2 Roadmap (§3.4 + §6.2)
# -----------------------------------------------------------------------------
::: slide type=split
kicker: Phase 2 Roadmap
title: Beyond the POC — <em>Safety & Training</em>
body: Two additional use cases extend verification beyond installation quality. Indicative pricing — to be confirmed when scope is locked.
bullets:
  - <strong>Safety Compliance</strong> — PPE detection, certificate OCR, validity check · HKD 80,000
  - <strong>Training Attendance</strong> — video upload, facial recognition, attendance tracking · HKD 70,000
  - <strong>Support & Maintenance</strong> — updates, bug fixing, model retraining · HKD 30,000/year
variant: blue
big-number: 150k
big-icon: layer-group
big-label: HKD · Phase 2 use cases
:::

# -----------------------------------------------------------------------------
# 16. Demarcation of Responsibilities (§8)
# -----------------------------------------------------------------------------
::: slide type=compare
theme: cnr
kicker: Demarcation of Responsibilities
title: Who Does What
left:
  title: C&R
  items:
    - Discovery and requirements documentation
    - Develop and customise AI verification models
    - Build anti-fraud detection module
    - Build OneDrive integration (folder detection, file sync)
    - Build admin dashboard with scan trigger and results display
    - Documentation and training
    - Support pilot deployment and testing
right:
  title: Towngas
  items:
    - Provide sample images for AI model tuning
    - Provide installation standards/guidelines
    - Provide OneDrive / Microsoft Graph API access
    - Define and communicate folder naming convention to contractors
    - Identify pilot sites and contractors
    - Provide subject matter experts for verification criteria
    - Define fraud alert thresholds and review procedures
    - Coordinate contractor training on folder use and photo upload
:::

# -----------------------------------------------------------------------------
# 17. Success Metrics (§9 — only non-strikethrough metrics)
# -----------------------------------------------------------------------------
::: slide type=stats-grid
kicker: Success Metrics
title: How We'll <em>Measure Success</em>
intro: Targets agreed for the POC. Strikethrough metrics in the paper are excluded here as out of scope for this phase.
stats:
  - value: <10s
    label: Per-photo processing after scan
    variant: accent
  - value: >99%
    label: Photos successfully synced
  - value: 100%
    label: Exact duplicate detection
    variant: light
  - value: >85%
    label: Near-duplicate image detection
:::

# -----------------------------------------------------------------------------
# 18. Assumptions & Caveats (§7) — key items
# -----------------------------------------------------------------------------
::: slide type=feature-grid
kicker: Assumptions & Caveats
title: What This <em>Estimate Assumes</em>
intro: Costs are ballpark — final pricing confirmed after Discovery. Five highlights from the full nine-item list in the paper.
items:
  - icon: list-check
    title: Requirements Finalised
    body: Costs subject to change based on detail gathered in the Discovery phase.
    accent: blue
  - icon: images
    title: Sample Data Available
    body: Towngas will provide sufficient sample images for AI model training.
    accent: accent
  - icon: clock
    title: EXIF Data Available
    body: Timestamp fraud detection depends on contractor devices preserving EXIF. Some camera apps strip it.
    accent: blue
  - icon: shield-halved
    title: Basic Fraud Scope
    body: Catches exact duplicates, rapid submissions, similar photos. Sophisticated fraud (clean whiteboard rewrites, photos >5 min apart) may not be detected.
    accent: accent
  - icon: cloud
    title: OneDrive API Access
    body: Towngas provides Microsoft Graph API permissions for folder monitoring and file sync.
    accent: blue
:::

# -----------------------------------------------------------------------------
# 19. Next Steps (§10)
# -----------------------------------------------------------------------------
::: slide type=process-steps
theme: cnr
kicker: Next Steps
title: From Proposal to Kickoff
steps:
  - num: 01
    icon: file-lines
    title: Proposal Review
    body: Towngas reviews and provides feedback.
  - num: 02
    icon: comments
    title: Discovery Session
    body: Deep-dive into verification criteria, folder structure, OneDrive API access.
  - num: 03
    icon: images
    title: Sample Data
    body: Towngas provides training images.
  - num: 04
    icon: file-signature
    title: Contract Signing
    body: Finalise scope and timeline.
  - num: 05
    icon: rocket
    title: Project Kickoff
    body: Begin Discovery phase.
:::

# -----------------------------------------------------------------------------
# 20. Thank you (§11)
# -----------------------------------------------------------------------------
::: slide type=thank-you
title: Let's <em>Build</em>.
body: Proposal validity — 30 days from date of issue.
contact-name: Anne So, Chief Strategy Officer · C&R Holdings Limited
contact-email: anne.so@candrholdings.com
:::
