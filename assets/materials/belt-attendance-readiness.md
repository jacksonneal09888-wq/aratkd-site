# Belt Attendance Guide (Parent Edition)

Keep it simple: before requesting a test, make sure **two numbers** and **four stripes** are locked in.

## Step 1 · Track Lessons & Attendance

1. **Count classes offered** since the last test cycle (example: 12 weeks × 3 classes/week = 36).
2. **Count classes attended** during that same window.
3. Attendance % = `classes_attended ÷ classes_offered`.

> Every belt also lists a minimum number of lessons. That number comes straight from the printed curriculum packet.

## Step 2 · Hit the Numbers

- `lessons_required` = minimum classes for that belt (see table).
- `target_attendance` scales from **70 %** up to **90 %** as lesson counts climb.

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
| **White** | 25 | 70 % |
| **High White** | 25 | 70 % |
| **Yellow** | 25 | 70 % |
| **High Yellow** | 25 | 70 % |
| **Green** | 25 | 70 % |
| **High Green** | 30 | 74 % |
| **Blue** | 30 | 74 % |
| **High Blue** | 32 | 76 % |
| **Red** | 42 | 85 % |
| **High Red** | 48 | 90 % |

## Step 3 · Earn All Four Stripes

1. Forms / Poomsae
2. Self-defense
3. Board breaking
4. Sparring

When **lessons ≥ minimum**, **attendance ≥ target**, and **all four stripes** are signed off, the student is ready to hit the “Request Test” button in the portal.

### Quick Example

- Offered: 36 classes · Attended: 31 → Attendance = 86 %.
- Belt goal: Red → Need 42 lessons + ≥ 84.8 %.
- Result: Student still needs 11 more lessons before requesting a date.

### In the Student Portal

The new “Testing Readiness Tracker” lets families log:

- Classes offered & attended (calculates attendance automatically)
- Stripe sign-offs
- Belt-specific targets pulled from this guide

The **Request Test** button unlocks only after the tracker shows **Ready**. Until then, it lists what’s missing so students know exactly what to work on.
