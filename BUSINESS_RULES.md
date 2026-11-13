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
