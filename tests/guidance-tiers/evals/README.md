# Behavioural evaluation of `guidance-tiers`

`evals.json` holds the prompts, the fixture each runs against, and what to check. Run it by hand with `skill-creator` before a merge that changes `SKILL.md`; it is a review step, not a merge gate. Build each fixture as described, run an agent with the skill against it, answer its questions, and grade the assertions. Record the outcome in the pull request.
