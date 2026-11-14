# Design system

## Visual direction
An understated, polished TPM command center: deep navy navigation, blue interactive accents, calm neutral surfaces, readable tables, and restrained palm imagery. Use approved TPM logo/palm assets when available; use a generic decorative palm placeholder clearly identified during development until then. Do not infer logo rights, brand hex values, or an exact prior screenshot layout from this document.

## Tokens
Define semantic Tailwind tokens: brand.navy, brand.blue, surface.canvas, surface.card, text.primary, text.muted, border.default, focus.ring, status.info, status.warning, status.critical, status.success, and status.unknown. Exact colors are pending approved assets and contrast checks. Keep typography, spacing, radius, shadows, and chart colors centralized. A proposed spacing rhythm is 4/8/12/16/24/32 pixels; this is a layout proposal, not established TPM branding.

## Layout
Desktop: persistent left navigation with the six tab names in PROJECT.md, header with portfolio context, source mode, report time and last successful import, shared filter bar, then content. Overview leads with Morning Briefing and summary cards. Work Orders favors a searchable table with a detail drawer. Keep palm decoration outside dense data areas.

Proposed responsive breakpoints: wide desktop at 1280px+, compact desktop/tablet at 768–1279px, mobile below 768px. Treat these as tunable. Collapse navigation accessibly on smaller screens; stack cards and filters; keep table headers available with an explicit horizontal scroll container or an equivalent labeled card view. Never hide essential dates, statuses, or actions merely to fit mobile. Avoid fixed page heights; support iframe resizing or documented scrolling behavior.

## Components
- KPI: label, value, denominator/scope, time basis, and unknown/excluded count where relevant.
- Status badge: text plus visual cue; never color alone. Preserve access to original source status.
- Data Health: source mode, report-as-of, successful import time, latest attempt state, freshness, warnings, and per-dataset coverage.
- Briefing/nudge: reason, supporting data, rule threshold, and link into the filtered queue.
- Filter controls: visible labels, active chips, result count, clear-all, keyboard support.
- Detail drawer: read-only work-order fields, source provenance, missing-data labels, verified Rentvine link when available.
- Chart: units, time basis, legend, accessible summary/table, coverage and exclusions.

## States and language
Use “Unknown” for unavailable values, “Not applicable” only when established, “No matching results” for filters, and “No data imported” before import. Use “No eligible records” when data exists but cannot support a metric. Distinguish loading, error, stale, partial, demo, and permission-denied states. Never show zero as a substitute for missing data. Explain how to recover from failed imports without exposing raw sensitive rows.

## Accessibility and interaction
Target WCAG 2.2 AA, keyboard operation, visible focus, logical headings, labeled controls, screen-reader table headers, announced import/filter results, contrast validation, reduced motion, and touch-friendly controls. Dialogs trap focus and return it on close. Provide real text for palm graphics when meaningful; decorative palms have empty alternative text. Do not rely on hover. Confirm charts and filters at narrow widths and 200% zoom.

## Design preservation
Implement reusable components and tokens. Capture approved screenshots with synthetic data. Make later API work behind the data layer without redesigning screens. Seek a product decision before substantial layout or brand changes.

## Reference-led Overview redesign
The user supplied a tropical maintenance-dashboard reference and requested a denser visual treatment of the existing application. Overview now uses an original SVG sunset/mountain/palm landscape in the navy sidebar and header, a serif command-center title, sidebar-only navigation, tinted KPI cards, and a desktop insights rail. The six documented navigation names remain unchanged. Tablet panels reflow to two columns; mobile panels stack and retain labeled scroll containers for wide tables. The exact palette and wordmark remain provisional rather than an approved logo reproduction.

The Action Center incorporates the preserved Morning Briefing. The status donut, property heatmap, vendor workload, monthly creation/completion chart and sortable work-order table use the shared filtered snapshot. Color is supplemented by names and counts. The assistant is labeled Coming soon; no AI responses, performance percentages, source events or history are invented. Recent Activity explicitly states that no event log exists.

## Overview polish
The command-center header is now 100px on desktop/tablet and 132px on mobile, preserving the original mountain/palm landscape and wordmark. Five primary cards show Open Work Orders (known active), Awaiting Approval, Over 7 Days Old (the label follows the configured threshold), Completed This Month (the report's month, not the browser month), and Average Days to Close (eligible observed completion pairs). Sample sizes, precision and exclusions remain visible. Empty or incompatible duration cohorts show Unavailable.

Work-order rows use stronger text-and-dot status badges, threshold-qualified age indicators, explicit assignment coverage and specific read-only review prompts. Sticky sortable table headers and zebra rows improve scanning; the table retains keyboard-accessible scrolling at narrow widths. The compact assistant rail remains rules-based and explicitly marks AI and external integrations as unavailable. Focused presentation adjustments live in `src/polish.css` after the existing stylesheet.

## Work Order Explorer presentation
Explorer reuses the tropical shell and semantic tokens. A source-qualified report strip precedes compact multi-select filters, five scoped summary cards and a sortable/paginated register. Unknown, pending and aging states retain text labels as well as color. The register fits wide desktop layouts and provides a labeled keyboard-scrollable region on narrower screens; work-order numbers open complete read-only details. CSV mapping and preview use the existing focus-contained native modal pattern. No source-system action is enabled by visual emphasis.

## Current approved desktop-first layout
The horizontal navigation bar has been removed. Preserve the navy sidebar's icons, active state, TPM wordmark and original mountain/palm artwork. A fixed sidebar fills the current viewport (including iframe viewports); a matching navy shell background continues down long documents. Short-height desktop frames compact the same navigation/footer, with scrolling only if content genuinely exceeds available height. Main content remains offset from the sidebar.

Explorer uses one Work Order Explorer heading and a compact source/actions strip. CSV import is a secondary text action. The priority columns are work-order number, property, issue, status, vendor, age and next action. Approval, category, priority and dates remain in the detail view, with secondary sorting preserved in the register controls. KPI buttons expose their pressed state and a visible filter reset. Paginated tables use page-level vertical scrolling; horizontal overflow is a fallback for genuinely narrow embedded viewports rather than a desktop default.

Desktop widths 1366–1920px and desktop Chrome/Edge are the development and QA targets for this and future phases. No new dedicated mobile interface or screenshots are required. Keep basic reflow, keyboard access, contrast and approved design intact. Actual protected Google Sites integration still requires validation against the portal's real framing and authentication setup.

## Phase 3 Action Center
Preserve the approved navy sidebar, full-height scrolling behavior, mountain/palm artwork and desktop-first content grid. Action Center has a source-qualified strip, compact filters, five eligibility-qualified KPI buttons, navy Morning Briefing and a six-column queue grouping work-order/property, issue/status, vendor, age/approval/priority, reasons and recommendations. This keeps all requested information visible at desktop sizes with horizontal scrolling only inside narrower iframe viewports.

The detail modal reuses established source fields/history and adds a clearly labeled facts/recommendations section and editable local template editor. Native dialog focus containment, disclosure target sizes, clipboard feedback, pressed-state filter buttons and text-and-color reason badges remain accessible. No dedicated mobile design, duplicate navigation or fake assistant/chat experience is introduced.
