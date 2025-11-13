# Belt Readiness Update — Summary for Master Ara

**Where it lives:** `assets/materials/belt-attendance-readiness.md` (referenced by the student portal content team).

## What Changed
- Translated the “Amount of Class Participation” numbers from the curriculum PDF into an attendance-percentage ladder, so parents know when they can request a test without guessing.
- Locked in a formula that scales from 70 % (25 lessons) up to 90 % (48 lessons) and still works if the red-belt sheet uses 38 lessons.
- Documented that every student must (a) hit the minimum lesson count, (b) meet the attendance percentage, and (c) collect all four stripes (Forms, Self-Defense, Board Breaking, Sparring) before testing.

## Why It Matters
- Gives families a single sheet to track progress between test cycles, reducing surprise “not ready” conversations.
- Aligns the portal, front-desk staff, and instructors on identical readiness numbers.
- Sets the guardrails we need for the upcoming “Apply for Belt Test” feature in the student portal.

## Portal Implementation Plan
1. Store attendance history per student (class scans or manual entry).
2. Calculate attendance % per belt cycle using the documented formula.
3. Track digital stripe sign-offs (existing certificate uploads or instructor portal toggles).
4. Gate the “Request Test” button until all three readiness checks pass, then route the request to staff for approval.

Let me know if any percent targets should shift before we wire this into the live portal.
