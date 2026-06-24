# Intelligence Layer

## Messy Inputs
- Free-text progress notes with no structure
- Inconsistent blocker descriptions
- Varying hours reported per person

## Auto-Structure Schema (from weekly update text)
```json
{
  "work_item_id": "uuid",
  "week_start": "2025-01-13",
  "extracted_blockers": ["awaiting sign-off", "dependency on vendor"],
  "risk_flag": "high",
  "risk_score": 0.82,
  "risk_source": "rule-engine-v1",
  "risk_confidence": 0.82,
  "risk_review_status": "unreviewed",
  "digest_draft": "Three items in progress; one blocked awaiting approvals.",
  "digest_source": "gpt-4o",
  "digest_confidence": 0.75,
  "digest_review_status": "unreviewed"
}
```

## Events to Track
- Weekly update submitted
- Status changed to `blocked`
- Work item overdue (due_date < today and status ≠ complete)
- No update submitted for 7+ days

## Scoring Rules (v1 — rule-based, no AI)
- `risk_score` = 0.4 × (days_overdue / 7) + 0.4 × (status == blocked ? 1 : 0) + 0.2 × (no_update_days / 7)
- Capped at 1.0
- Items with score ≥ 0.7 flagged as high-risk

## What Gets Ranked
- Work items sorted by risk_score descending on dashboard
- Blocked items always surfaced at top

## v1 vs Later
| v1 | Later |
|---|---|
| Rule-based risk score | LLM-extracted blocker tags |
| Manual digest writing | AI-drafted weekly digest (stored with source + confidence + review_status) |
| Overdue highlight | Proactive overdue reminders via email/Slack |
