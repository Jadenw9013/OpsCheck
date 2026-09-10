# Paste this into Claude Code from the repository root

Build the OpsCheck interview-demo MVP from the Markdown specifications in this folder. This is a greenfield repository; create the application inside `web/`, leaving the supplied planning documents and seed data intact.

I authorize implementation of **M0 through M4 only**, with continuation between milestones once their stated gates pass. I authorize normal local dependency installation and, where available, Chromium installation for the specified Playwright tests. Do not use paid services, introduce real company data, deploy publicly, push to a remote, or expand beyond the MVP. Local Git initialization/commits are allowed only in this repository and only with an already-configured identity; otherwise continue without inventing one.

First read `CLAUDE.md`, `START_HERE.md`, `TASKS.md`, `DECISIONS.md`, and `HANDOFF.md`. Then read the implementation plan and the documents needed for M0. Before building the engine, read the full data contract, validation specification, fixture/oracle specification, and test plan.

The goal is a useful working demo quickly, not an elaborate platform. Use one builder. Do not launch agent-review teams, monitoring loops, or a new planning exercise. Do not ask me to reconfirm routine implementation decisions already settled in the documents.

Use the supplied 18 synthetic scenarios and independent expected results. Implement the pure TypeScript engine from the specified rules; never implement fixture-name conditionals or use expected outputs as production results. Preserve source record/column references, distinguish incomplete and invalid inputs from plan violations, and block plan evaluation when required data is not valid. A changed input invalidates the previous result.

The first major product checkpoint is M2: baseline, earlier departure, missing data, and evidence navigation working in the browser. Proceed to M3/M4 only after the previous gates pass. Do not let optional UI polish delay this checkpoint.

After each milestone, run the required commands, fix concrete failures, and update `TASKS.md`, `VERIFICATION.md`, and `HANDOFF.md` with actual evidence and the exact next step. If an environment command fails twice without a clear fix, stop repeating it, document the blocker, and use only the documented fallback. Never mark skipped or unavailable checks as passed.

When M0–M4 are complete, stop and give me the run command, what actually works, the verification results, remaining limitations, and the one-minute demo script. Do not start optional enhancements. Begin M0 now.
