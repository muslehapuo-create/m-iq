# Security Specification — M-IQ (Mindset Itqan)

## 1. Data Invariants
1. Students cannot self-assign `role: "admin"` or create documents in `/admins/{uid}`.
2. Students can never read, list, create, update, or delete `draft` modules, topics, resources, checklist items, self-assessment items, or rubric criteria.
3. Students can only read, create, and update their own `/studentProgress/{uid}`, and only read, create, update, or delete their own `/reflections/{id}` and `/feedback/{id}` records (`userId == request.auth.uid`).
4. Students can create immutable `/studentActivities/{id}` logs strictly with `userId == request.auth.uid` and server timestamp `createdAt == request.time`, and can never read or delete another student's activity logs.
5. Students can read published `/assessmentConfigs/{id}` scoring settings, but only verified admins can create, update, or delete `/assessmentConfigs/{id}` and `/selfAssessmentItems/{id}`.
6. Students cannot tamper with `adminReply` or `status: "reviewed"` on `/feedback/{id}` updates.
7. Every `create` and `update` validates exact key allowlists (`hasAll` + `hasOnly`), string `.size()` bounds, ID regexes (`^[a-zA-Z0-9_-]+$`), and server-time timestamps (`request.time`), including structured `i-Refleksi M-IQ` fields (`status`, course/student metadata, `style`, and bounded `guidedAnswers`) on `/reflections/{id}`.
8. User profiles containing email PII are readable only by the profile owner or verified admins.
9. Only verified admins can create, update, or delete `/lecturerDirectory/{uid}` entries; signed-in students can only read non-PII lecturer names and titles.
10. Students can only read, create, update (limited to safe student actions: mark read, accept rescheduled date/time, or cancel active requests), or delete (`pending`/`cancelled`) their own `/appointments/{id}` (`userId == request.auth.uid`). Students can never self-approve a `pending` appointment, write `lecturerFeedback`, `rejectionReason`, or `meetingOutcome`, or mutate terminal `completed`/`rejected` records.
11. Students can only read, create (with initial `status: "dihantar"` and empty lecturer feedback fields), update (limited strictly to marking read, or saving `studentFollowUpNote` / marking `selesai` after feedback is provided), or delete (`status == "dihantar"`) their own `/itemuRecords/{id}` (`userId == request.auth.uid`). Only verified admins (Pensyarah) can write `detailedFeedback`, `strengthsReview`, `weaknessesReview`, `improvementSuggestions`, `nextActionGuide`, `feedbackAt`, or transition review statuses (`menunggu_maklum_balas`, `sedang_disemak`, `maklum_balas_diberikan`).

## 2. Adversarial Payloads ("Dirty Dozen")
1. Student writes `/users/{uid}` with `role: "admin"`. -> `PERMISSION_DENIED`
2. Student updates `/users/{uid}` adding ghost key `isSuperAdmin: true`. -> `PERMISSION_DENIED`
3. Student creates `/admins/{uid}` to escalate privilege. -> `PERMISSION_DENIED`
4. Unverified email spoof (`email: "muslehapuo@gmail.com", email_verified: false`) writes `/modules/m1`. -> `PERMISSION_DENIED`
5. Student lists `/topics` or `/selfAssessmentItems` without `status == "published"` filter (attempting to read drafts). -> `PERMISSION_DENIED`
6. Student creates `/topics/t1` with 1MB `content` string or missing `style`. -> `PERMISSION_DENIED`
7. Student reads `/users/otherUid` or `/studentProgress/otherUid` or lists `/studentActivities`, `/appointments`, or `/itemuRecords` without `userId == request.auth.uid`. -> `PERMISSION_DENIED`
8. Student creates `/reflections/r1`, `/studentActivities/a1`, `/appointments/ap1`, or `/itemuRecords/ir1` with `userId: "otherUid"`. -> `PERMISSION_DENIED`
9. Student updates `/reflections/r1` or `/itemuRecords/ir1` changing immutable `createdAt` or `userId`, or attempts to mutate an immutable `/studentActivities/a1`. -> `PERMISSION_DENIED`
10. Student attempts to create or modify `/assessmentConfigs/self-assessment` or `/lecturerDirectory/{uid}`. -> `PERMISSION_DENIED`
11. Student updates `/feedback/f1` to overwrite `adminReply`, or updates `/itemuRecords/ir1` to write `detailedFeedback`, forge `feedbackByUid`, or set `status: "maklum_balas_diberikan"`. -> `PERMISSION_DENIED`
12. Attacker creates `/modules/invalid$id!` or `/itemuRecords/invalid$id!` with poisoned document ID. -> `PERMISSION_DENIED`
