# Ara TKD QA Checklist

**Public Site**
- [ ] Homepage loads without console errors.
- [ ] Hero banners render from `/site/banners` and rotate.
- [ ] Navigation links work on desktop and mobile.
- [ ] Calendar loads (Google Sheet CSV).
- [ ] Contact page form submits correctly.
- [ ] Phone/email links open correctly.

**Student Portal**
- [ ] Login works with valid Student ID + birthdate.
- [ ] Invalid login shows error message.
- [ ] Profile data matches server data after login refresh.
- [ ] Belt progress loads and matches server records.
- [ ] Certificate upload succeeds and updates progress.
- [ ] Attendance summary updates after certificate upload.
- [ ] Logout clears session and hides portal view.

**Admin Portal**
- [ ] Admin login succeeds with correct credentials.
- [ ] Roster loads and matches server data.
- [ ] Student detail panel opens and saves updates.
- [ ] Attendance panel loads latest entries.
- [ ] Events panel can add/toggle events.
- [ ] Website banners tab loads and can add/remove banners.
- [ ] Remove Student archives student and removes from roster view.

**Archive & Data Integrity**
- [ ] Archived students no longer appear in roster or activity.
- [ ] Archived student login is blocked.
- [ ] After 30 days, archived students are permanently removed.

**Responsive & Visual**
- [ ] Admin sidebar fits all buttons without overflow on 1440px and 1280px widths.
- [ ] Buttons are aligned, consistent height, and readable.
- [ ] Mobile layout works for nav and portal forms.
