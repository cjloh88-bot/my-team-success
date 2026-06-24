# Test Plan

## Success Scenario (manual walkthrough)
1. Open `/dashboard` in a fresh browser tab (no login)
2. **Verify:** 5 seeded work items visible with status badges, owner names, and last-update timestamps
3. Click "Q3 Vendor Contract Renewal"
4. **Verify:** Detail page shows description, owner, due date, and 2 historical weekly updates
5. Click "Submit Weekly Update"
6. Fill: Status = In Progress, Progress Notes = "Legal review returned; minor edits needed", Blockers = (empty), Hours = 2
7. Submit form
8. **Verify:** New update appears at top of history on detail page with today's date
9. **Verify:** `is_current = true` on new update, false on previous
10. Navigate back to `/dashboard`
11. **Verify:** Work item shows updated status and new last-updated timestamp
12. **Verify:** `activities` table has a new row for `update_submitted`

## Empty State
- Delete all work items from DB → open `/dashboard` → **Verify:** "No work items yet" empty state message and a "Log Work Item" CTA button are shown

## Error Cases
| Scenario | Expected Behaviour |
|---|---|
| Submit weekly update with no progress notes | Inline validation error: "Progress notes are required" |
| Invalid status transition (e.g. Not Started → Complete) | Toast: "Status cannot jump from Not Started to Complete" |
| Supabase unreachable | Error toast: "Could not save update — please try again" |
| Work item detail for non-existent ID | 404 page: "Work item not found" |

## Loading State
- Throttle network to Slow 3G in DevTools → open `/dashboard` → **Verify:** skeleton loading cards appear before data resolves

## Permission Check (post Sprint 3)
- Log in as Viewer role → attempt to submit a weekly update → **Verify:** form submit button is disabled or returns 403
- Log in as Member → attempt to edit another member's work item → **Verify:** 403 error
