# Agentic Layer

## Risk Levels

### Low — Auto (no approval needed)
- Tag a work item with auto-detected priority based on due date + status
- Generate a risk score for each work item (rule-based)
- Draft a weekly digest summary from submitted updates

### Medium — Light Approval (admin confirms before executing)
- Change a work item's status on behalf of a team member (e.g. auto-close overdue complete items)
- Mark a weekly update as current when a newer one is submitted

### High — Always Approval
- Send a digest email or Slack message to the team
- Create a work item on behalf of a user

### Critical — Human Only
- Delete a work item or its update history
- Export and purge audit logs

## Named Tools (approved list)
- `score_work_item(work_item_id)` — computes and stores risk score
- `draft_weekly_digest(week_start)` — generates summary text, stores with review_status=unreviewed
- `publish_digest(digest_id)` — marks digest as published after admin approval
- `flag_overdue_items()` — returns list of items past due with no complete status

## Approval Flow
Draft → stored with `review_status = 'unreviewed'` → Admin reviews in UI → Approve sets `review_status = 'approved'` and executes → Action + result written to `audit_logs`.

## Audit Log Fields
`actor_id`, `table_name`, `record_id`, `action`, `before_state`, `after_state`, `created_at`

## v1 vs Later
| v1 | Later |
|---|---|
| Rule-based scoring (auto) | LLM digest drafts (high approval) |
| Overdue flagging in UI | Automated Slack/email alerts |
