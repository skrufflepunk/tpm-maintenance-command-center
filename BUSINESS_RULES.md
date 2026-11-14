# Business rules

## Authority and time basis
Rentvine is authoritative. The dashboard derives read-only observations from imported data. All cards, queues, charts, and briefings use the same pure rule functions and rulesVersion. Use a portfolio timezone confirmed by TPM; California scheduling in the conversation is a proposal and does not establish the portfolio timezone. Display source report-as-of, import time, and browser viewing time separately. If report-as-of is unknown, label calculations using import time as an explicit fallback.

## Proposed configurable settings
These are examples for review, not approved service levels or emergency-response policies. Store them in one validated configuration source; display active values in rule explanations. Production requires a confirmed portfolio timezone.

| Setting | Proposal | Meaning |
|---|---|---|
| agingNudgeDays | 7 | Known active age strictly greater than 7 calendar days |
| agingBucketBoundaries | 7, 14, 30 | 0–7, 8–14, 15–30, 31+ known calendar days |
| noObservedChangeDays | 3 | At least 3 elapsed 24-hour periods since last observed relevant change, with comparable history |
| staleAfterHours | 24 | Latest report-as-of older than 24 elapsed hours; fallback import time clearly labeled |
| workOrderReportSchedule | weekdays 09:00 and 14:00 America/Los_Angeles | Possible CSV cadence, subject to source support and TPM confirmation |
| vendorReportSchedule | Monday 09:00 America/Los_Angeles | Possible vendor cadence; its freshness policy must be configured separately |

Schedules do not create automation. No observed-change or freshness rule is an emergency monitoring guarantee. Initial CSV uploads are manual. Weekly vendor freshness must not inherit the 24-hour work-order threshold.

## Status, age, and metrics
- Known active statuses: open, in_progress, on_hold. Terminal statuses: completed, cancelled. Unknown status is excluded from both active and terminal totals and counted separately. Label active totals as known active if status coverage is partial.
- Age is difference between local calendar dates of reference time and created date in portfolio timezone, for known active records with valid creation dates. Reference time is report-as-of, or labeled import-time fallback. Negative ages are invalid and excluded. Closed/cancelled records have no active age.
- Aging counts include only eligible known active records; unknown ages have a separate count. At exactly 7 days, the example >7 nudge does not fire. Bucket boundaries cover all nonnegative integer ages without overlaps.
- Pending approvals require explicit approvalState=pending on known active records. Approval age requires a verified approval-request date; it is otherwise unavailable.
- Unassigned work requires known active status and vendorAssignmentState=unassigned. A missing vendor directory row with an assigned vendorId is an unmatched join, not unassigned.
- Urgent count requires known active status and mapped source priority=urgent. Do not derive emergency classification from summary text or age.
- Completion duration uses valid created and completed dates on status=completed records. For timestamp pairs, use elapsed hours divided by 24; for date-only pairs, use calendar-day difference and label that basis. Never mix precision types into one unlabeled statistic. Exclude inverted/missing pairs; same-day zero duration can be valid. Show mean, median, n and exclusions. Cancelled records are excluded.
- Created trends group valid creation dates by portfolio month; completion trends use valid completion dates and completed status. Date filters explicitly name their basis. No eligible rows means unavailable, not zero average.
- Workload counts assigned known active records by vendor in the filtered latest observed dataset. Historical completion metrics are limited to supplied history, not vendor-wide performance.
- Ratings display only actual provided values with count and scale. Missing count/scale makes coverage uncertain. Do not assume any rating scale or minimum representative sample.

## Changes and no-observed-change nudges
Compare current and previous compatible work-order snapshots by stable scoped key. Record new records and changes to normalized status, priority, assignment, approval, and relevant dates. detectedAt is import detection time, not the source event time. First import and incompatible report scopes show “Comparison unavailable.” A disappearance is flagged, never interpreted as closure. Explicit source completed status is needed to count completion.

Track the first observation and last relevant detected change across comparable snapshots. A no-observed-change nudge needs at least two observations and history spanning the configured interval; use import detection times for this observed duration and label it accordingly. A sourceUpdatedAt alone does not establish lack of actual activity or a complete change history. Missing/unavailable fields must not create false change events; show a coverage change separately. Baseline resets when history is not comparable.

## Queue and briefing
Deduplicate work orders while retaining all reasons. Proposed queue sort: source urgent first, confirmed pending approval next, aged next, unassigned next, no observed change next; within the highest applicable reason sort known age descending, then stable ID ascending, unknown age last. The order is configurable and not a clinical/safety or contractual priority determination. Data-health issues form a separate briefing section, not fake work orders.

Briefing uses active filters with an explicit scope label; optional portfolio reset restores all data. Each count links to the exact predicate used. A missing-data count explains excluded records. Nudges are suggestions for staff to review and act in Rentvine; no automatic email, SMS, assignment, approval, or status change.

## Freshness and failures
Evaluate freshness per dataset against configured policy. Unknown source timestamp yields unknown source freshness; import-time fallback may describe receipt freshness only. A recent import of an old report is still old source data. Failed imports retain previous successful data, show the failed attempt, and never imply a refresh succeeded. Do not manufacture a next expected report if no schedule is configured.

## Overview KPI presentation
“Open Work Orders” is the known active backlog (open, in_progress, on_hold), with unknown statuses excluded and disclosed. “Awaiting Approval” counts explicit pending approval on known active records. “Over 7 Days Old” uses the configured agingNudgeDays and changes its label if that setting changes; eligibility and the strict greater-than comparison are unchanged.

“Completed This Month” uses the report-as-of calendar month in the configured portfolio timezone (or the explicitly labeled import-time fallback), scoped by the shared filters. It requires explicit completed status and a valid completion date at or before the reference time/date. Missing completion dates are excluded and counted; an entirely undated completion cohort or unavailable reference month displays Unavailable. No matching completed records yields zero when the reporting month is known.

“Average Days to Close” is the mean observed creation-to-completion duration across all scoped completed records, not just this month's completions. It follows the existing completion-duration eligibility rules, discloses sample size and exclusions, and labels calendar or elapsed days. No eligible pairs or simultaneously eligible date-only and timestamp cohorts produces Unavailable in the single-number card; the separate precision-specific statistics remain available below. No historical comparisons or performance percentages are inferred.

## Phase 3 Action Center calculations
The Action Center calls the existing active/urgent/approval/aging/assignment rules and uses the same configured priority order. One ActionItem retains all eligible reasons; its primary sort reason is the highest configured reason. No-change-only items come after those four reasons. KPI and briefing counts are reason subsets of that single ActionItem set and are scope-qualified. Unknown status prevents active follow-ups; missing assignment or approval coverage cannot create the corresponding reason. Scheduling has no supported source fields, so scheduled-review metrics remain Unavailable.

The no-observed-change evaluator currently uses only the retained comparable CSV pair. It requires matching source mode, schema/mapping semantics, account, report scope and timezone; the same record must appear in both loads with known active status, priority, assignment, approval, valid creation date, stable coverage and unchanged relevant normalized status/priority/assignment/approval/dates. Actual load times must span at least noObservedChangeDays elapsed 24-hour periods. This is a conservative observation window, not an assertion of actual inactivity or a complete maintenance audit. A recent/absent pair, changed coverage, missing row, incompatible scope, invalid clock or unknown required evidence cannot establish eligibility. SourceUpdatedAt by itself never establishes it. Replays do not fabricate new history.

Recommendations explain source or observed facts separately from suggested staff actions. Urgent source priority calls for prompt review, not an automatically declared emergency. Pending approval suggests requesting a decision without alleging delay or ignoring. Missing assignment suggests reviewing/selecting a vendor in Rentvine without assigning one here. Aging suggests checking source activity and the responsible party, not assuming no work occurred. Drafts reference only supplied redacted issue/property/work-order facts; no appointments, decisions, recipient identities or commitments are generated.
