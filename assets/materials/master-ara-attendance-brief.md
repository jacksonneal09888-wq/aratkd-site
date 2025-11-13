# Belt Readiness Update — Summary for Master Ara

**Where it lives:** `assets/materials/belt-attendance-readiness.md` (referenced by the student portal content team).

## What Changed
- Translated the “Amount of Class Participation” numbers from the curriculum PDF into an attendance-percentage ladder, so parents know when they can request a test without guessing.
- Locked in a formula that scales from 70 % (25 lessons) up to 90 % (48 lessons) with unique lesson counts per belt, so expectations step up a little each rank. Still works if a legacy sheet lists 38 lessons for Red.
- Documented that every student must (a) hit the minimum lesson count, (b) meet the attendance percentage, and (c) collect all four stripes (Forms, Self-Defense, Board Breaking, Sparring) before testing.
- Wired the student portal: families log classes offered/attended + stripe sign-offs, and the “Request Test” button stays disabled until the tracker shows 100% readiness.
- Added a concealed-but-easy dashboard launcher: tap “Open Instructor Dashboard,” enter `MasterAra / AraTKD`, and the portal injects the key automatically (or you can reveal the key field if the Worker ever changes it). Students never see the data cards that render inside the modal.
- Published a parent-friendly PDF version of the attendance guide (`assets/materials/belt-attendance-guide.pdf`) and linked it inside the portal.

## Why It Matters
- Gives families a single sheet to track progress between test cycles, reducing surprise “not ready” conversations.
- Aligns the portal, front-desk staff, and instructors on identical readiness numbers.
- Sets the guardrails we need for the upcoming “Apply for Belt Test” feature in the student portal.

## Portal Implementation Plan
1. Store attendance history per student (class scans or manual entry) so we can replace the manual tracker with live data.
2. Calculate attendance % per belt cycle using the documented formula (already implemented on the front-end; needs API data feed).
3. Track digital stripe sign-offs (existing certificate uploads or instructor portal toggles) so staff can update readiness without parents toggling checkboxes.
4. Keep the “Request Test” gate in place, but add staff approvals + automated confirmations once requirements pass and a test request is submitted.

Let me know if any percent targets should shift before we wire this into the live portal.
