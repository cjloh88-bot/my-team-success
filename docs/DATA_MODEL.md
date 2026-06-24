# Data Model

## team_members
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable; linked at lock-down sprint |
| name | text | |
| email | text | |
| role | text | `admin` \| `member` \| `viewer` |
| created_at | timestamptz | |

## work_items
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| title | text | |
| description | text | |
| owner_id | uuid FK → team_members | |
| status | text | `not_started` \| `in_progress` \| `blocked` \| `complete` |
| priority | text | `low` \| `medium` \| `high` |
| due_date | date | |
| archived | boolean | default false |
| created_at | timestamptz | |

## weekly_updates
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| work_item_id | uuid FK → work_items | cascade delete |
| submitted_by | uuid FK → team_members | |
| week_start | date | Monday of the reported week |
| status | text | mirrors work_items status enum |
| progress_notes | text | |
| blockers | text | |
| hours_spent | numeric | |
| is_current | boolean | true = latest snapshot |
| created_at | timestamptz | |

## weekly_digests (AI-generated)
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| week_start | date | |
| summary_text | text | **AI field** |
| summary_source | text | e.g. `gpt-4o` |
| summary_confidence | numeric | 0–1 |
| summary_review_status | text | `unreviewed` \| `approved` \| `rejected` |
| published | boolean | |

## activities
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| work_item_id | uuid FK | |
| actor_id | uuid FK → team_members | |
| action | text | e.g. `status_changed`, `update_submitted` |
| detail | jsonb | before/after values |
| created_at | timestamptz | |

## audit_logs
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| actor_id | uuid FK → team_members | |
| table_name | text | |
| record_id | uuid | |
| action | text | `insert` \| `update` \| `delete` |
| before_state | jsonb | |
| after_state | jsonb | |
| created_at | timestamptz | |

## RLS (v1)
All tables: open read + write policies so demo works without login. Lock-down sprint replaces with `auth.uid() = user_id`.
