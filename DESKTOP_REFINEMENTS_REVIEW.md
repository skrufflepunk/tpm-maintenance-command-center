# Phase 2 final desktop refinements

Branch: `feat/phase-2-desktop-refinements`, based on completed Phase 2 `dc19113`.

The approved TPM design is preserved. The duplicated horizontal navigation is removed; the navy sidebar is the sole primary navigation. It remains fixed against the viewport and the navy background continues down the document. Short iframe heights adapt the same sidebar, without assuming the outer browser's dimensions. Register regions no longer add an unnecessary vertical scrollbar.

Explorer now has one heading and seven priority table columns: work order, property, issue, status, vendor, active age and next action. Approval details, priority, category and additional dates remain in the data model/detail view. A register sort selector preserves sorting by secondary metadata. Filters, pagination, CSV validation, source isolation, record details and Overview interactions remain functional.

Explorer KPI buttons apply the shared known-active, aging, explicit-pending and explicit-unassigned predicates. Counts are based on the current ordinary-filter context; selecting a different KPI replaces the previous KPI predicate. The visible reset clears just that predicate; Clear Explorer filters resets the full scope. Unknown values never establish eligibility.

CSV import is a secondary text action. The prepared Open in Rentvine detail action remains disabled because no record URL/verified origin is configured. Its helper accepts only actual HTTPS URLs on an exact verified origin, rejecting credentials, malformed/relative URLs, unapproved hosts and schemes. No endpoint, URL or identifier is generated. No live API, writeback, messaging, deployment or Phase 3 work is introduced.

## QA and operating boundaries

Default QA now targets desktop Chrome/Edge; prior mobile checks remain opt-in. Browser preparation uses official Chrome/Edge manifests with TLS verification and SHA-256 checks; binaries remain outside the checkout. No third-party application dependencies were added.

The local iframe test exercises navigation, KPI filtering, record dialogs, scrolling and a fixed sidebar in a 1060×620 content viewport inside a larger desktop browser. This is layout/interaction evidence, not verification of the actual Google Sites portal. Its production authentication, cookies/session expiry, CSP frame ancestors and access rules remain to be tested against the chosen protected host and real ancestor origins. No security policy is weakened to make embedding work.

See the completion report for final check counts and screenshots. Phase 3 remains pending the user's review and approval.

## Verified results

- Production build/TypeScript checking and ESLint passed.
- 59 unit/domain/data tests passed, including the unchanged CSV integrity suite and new exact-origin source-link rejection cases.
- All 44 desktop browser checks passed: Chrome 157 at 1366, 1440 and 1920px, plus Edge 157 at 1440px. Coverage includes existing Overview/Explorer/CSV workflows, accessibility scans, KPI quick filters/reset, secondary metadata sorting, seven-column layout, long-page sidebar behavior and a local 1060×620 iframe.
- Final visual review caught a Chromium fixed-layer branding repaint issue after scrolling; the sidebar/wordmark now retain a compositor layer. The affected layout/iframe/scroll matrix was rerun after that correction.
- Updated Explorer and Overview desktop screenshots, including scrolled viewport captures, are saved outside Git in `/workspace/artifacts/`. No mobile screenshots were generated and the opt-in legacy mobile suite was not run.

The local iframe is a same-origin layout simulation, not a live Google Sites session. Production portal authentication, session cookies and ancestor-origin policies remain unverified. Rentvine links remain unavailable with the empty verified-origin configuration. CSV evaluation remains memory-only and isolated. No merge, public deployment or Phase 3 implementation was performed.
