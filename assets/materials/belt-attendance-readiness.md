# Belt Attendance Readiness

Lesson minimums are copied directly from the official curriculum packet (`assets/materials/tkd-curriculum-aras-martial-arts.pdf`). The goal below is to express those lesson counts as an attendance percentage that families can track between tests.

## Readiness Formula

- `lessons_required` = minimum classes listed for the belt in the curriculum.
- `min_lessons` = 25 (White–Green belts), `max_lessons` = 48 (High Red Belt).
- `target_attendance` is scaled from 70 % to 90 % as lesson counts increase:

```
target_attendance(belt) = clamp(
    0.70 + (lessons_required - min_lessons) / (max_lessons - min_lessons) * 0.20,
    0.70,
    0.90
)
```

- Parents calculate their child’s current attendance as `classes_attended ÷ classes_offered_since_last_test`.
- A student is ready to test once ALL conditions are true:
  1. `classes_attended ≥ lessons_required`
  2. `attendance_percent ≥ target_attendance(belt)`
  3. All four stripes (Forms/Poomsae, Self-Defense, Board Breaking, Sparring) are signed off for the current belt

> If you still use the older red-belt sheet that lists 38 lessons, plug that number into the same formula—the resulting target percentage will fall between High Blue and Red Belt in the table below.

## Belt Targets

| Belt | Min. Lessons | Target Attendance |
| --- | ---: | ---: |
| White Belt | 25 | 70.0 % |
| High White Belt | 25 | 70.0 % |
| Yellow Belt | 25 | 70.0 % |
| High Yellow Belt | 25 | 70.0 % |
| Green Belt | 25 | 70.0 % |
| High Green Belt | 30 | 74.3 % |
| Blue Belt | 30 | 74.3 % |
| High Blue Belt | 32 | 76.1 % |
| Red Belt | 42 | 84.8 % |
| High Red Belt | 48 | 90.0 % |

### Example For Families

1. Count how many regular classes were available since the last test (e.g., 12 weeks × 3 classes/week = 36).
2. Count attended classes (e.g., 31).
3. Attendance % = 31 ÷ 36 ≈ 86 %.
4. A Red Belt needs 42 classes AND ≥ 84.8 % attendance, so in this example the student still needs 11 more classes before requesting a test date.

## Student Portal Integration

This checklist will power the “Apply for Belt Test” flow inside the student portal. The portal logic will require:

- Stored attendance % ≥ target for the student’s belt.
- Logged classes ≥ the raw lesson minimum.
- Digital confirmations for all four stripes (uploaded certificates or instructor sign-offs).

Once those three checks pass, the “Request Test” button becomes available. Until then, the portal will show what is still missing so families know exactly what to work on.
