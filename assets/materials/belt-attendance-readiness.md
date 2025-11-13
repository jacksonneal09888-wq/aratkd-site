# Belt Attendance Guide (Parent Edition)

Keep it simple: before requesting a test, make sure **two numbers** and **four stripes** are locked in.

## Step 1 · Track Lessons & Attendance

1. **Count classes offered** since the last test cycle (example: 12 weeks × 3 classes/week = 36).
2. **Count classes attended** during that same window.
3. Attendance % = `classes_attended ÷ classes_offered`.

> Every belt also lists a minimum number of lessons. That number comes straight from the printed curriculum packet.

## Step 2 · Hit the Numbers

- `lessons_required` = minimum classes for that belt (see table).
- `target_attendance` scales from **70 %** up to **90 %**—each belt nudges both numbers up a little so expectations grow with the student.

```
target_attendance = clamp(
    0.70 + (lessons_required - 25) / (48 - 25) * 0.20,
    0.70,
    0.90
)
```

> Using an older Red Belt sheet that says 38 lessons? Plug “38” into the same formula and you’ll land between High Blue and Red expectations.

### Minimums by Belt

| Belt | Lessons | Attendance Target |
| --- | ---: | ---: |
| **White** | 25 | 70.0 % |
| **High White** | 27 | 71.7 % |
| **Yellow** | 29 | 73.5 % |
| **High Yellow** | 31 | 75.2 % |
| **Green** | 33 | 77.0 % |
| **High Green** | 35 | 78.7 % |
| **Blue** | 37 | 80.4 % |
| **High Blue** | 39 | 82.2 % |
| **Red** | 42 | 84.8 % |
| **High Red** | 48 | 90.0 % |

## Step 3 · Earn All Four Stripes

1. Forms / Poomsae
2. Self-defense
3. Board breaking
4. Sparring

When **lessons ≥ minimum**, **attendance ≥ target**, and **all four stripes** are signed off, the student is ready to hit the “Request Test” button in the portal.

### Quick Example

- Offered: 36 classes · Attended: 31 → Attendance = 86 %.
- Belt goal: High Yellow → Needs 31 lessons + ≥ 75.2 %, so this student can unlock High Yellow.
- Belt goal: Red → Needs 42 lessons + ≥ 84.8 %, so the same student must bank 11 more classes before requesting a date.

### In the Student Portal

The new “Testing Readiness Tracker” lets families log:

- Classes offered & attended (calculates attendance automatically)
- Stripe sign-offs
- Belt-specific targets pulled from this guide

The **Request Test** button unlocks only after the tracker shows **Ready**. Until then, it lists what’s missing so students know exactly what to work on.
