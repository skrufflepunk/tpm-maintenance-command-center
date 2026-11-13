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
