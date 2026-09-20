---
name: Ticket
about: One vertical slice of a beat's spec, in the shape `to-tickets` produces. Opened by hand only when that skill is absent.
labels: ready-for-agent
---

<!--
A ticket carries its beat's family label, `{{FAMILY_PREFIX}}/<beat>`, and no status
label until a session claims it. The family label is per beat, so no template can
carry it: add it when opening (`--label {{FAMILY_PREFIX}}/<beat>`, or the sidebar).
`ready-for-agent` is the unclaimed state as `to-tickets` leaves it; a tracker whose
triage set names the ready label differently names it above instead.

Keep the four headings as they are. The lifecycle workflow parses `## Parent`; the
`## Blocked by` edges are the frontier.
-->

## Parent

#<the beat's issue number>

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective, not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- #<each ticket that gates this one>, or "None (can start immediately)"
