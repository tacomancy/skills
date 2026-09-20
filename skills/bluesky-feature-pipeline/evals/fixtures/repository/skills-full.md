# Skill inventory — full

`ls .agents/skills/` in `acme/reader`:

```
bluesky-feature-pipeline  code-review  diagnosing-bugs  grill-me  grill-with-docs
guidance-tiers  handoff  implement  land-ticket  pin-prototypes  reversibility-rank
tdd  to-spec  to-tickets  wayfinder
```

Every role the pipeline names has its example skill installed. `bluesky-feature-pipeline`'s `install.sh` has run: the templates, four workflows, and the labels `spec:needs-grilling`, `spec:ready-for-tickets`, `spec:tickets-generated`, `ticket:in-review`, `ticket:landed`, `ticket:blocked` exist, and the family prefix is `feature`.
