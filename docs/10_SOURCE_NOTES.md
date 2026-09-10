# 10 — Sources, grounded context, and unknowns

Prepared 2026-09-10. These are primary sources consulted while designing the kit. Source pages can change; package versions are selected and recorded during M0. They support the small factual context below, not the invented warehouse dataset or our business-value hypothesis.

## Company context
**[S1] Haladir — Software Engineering Intern (Fall 2026), employer-authored YC listing**
https://www.ycombinator.com/companies/haladir/jobs/1DftUiZ-software-engineering-intern-fall-2026

Describes end-to-end integration, decisioning, and operator-interface work, with AI coding tools and correctness/product judgment. This motivates demonstrating a complete, bounded engineering workflow.

**[S2] Haladir — platform / integration description**
https://www.haladir.com/

Describes customer-shaped operational data integration, models, implementation, and monitoring. It does not disclose the complete application stack or establish that our proposed utility is needed internally.

**[S3] Haladir — Introducing Nomos Sandbox: A Decision Layer You Can Watch Work, August 12, 2026**
https://www.haladir.com/blog/nomos-sandbox

Describes synthetic operational examples, planning, decision traceability, and customer-data validation. OpsCheck is not an attempt to reproduce that product or claim Haladir lacks validation.

## Tooling references
**[S4] Next.js — create-next-app CLI**
https://nextjs.org/docs/app/api-reference/cli/create-next-app

Reference for named-directory scaffolding and CLI options. Use the actual CLI help when an option changes; do not overwrite this root folder.

**[S5] Next.js — installation**
https://nextjs.org/docs/app/getting-started/installation

Reference for generated app setup, supported environment, and build/start commands. The selected test tool may require a newer runtime than Next's minimum.

**[S6] Vitest — getting started**
https://vitest.dev/guide/

Reference for runtime requirements and test commands. Select compatible stable versions, use nonwatch runs for milestone gates, and lock dependencies.

**[S7] Papa Parse — documentation**
https://www.papaparse.com/docs

Reference for CSV array mode, quoted fields, typing controls, blank-record behavior, and duplicate-header handling. Our exact rejection/provenance policies are project requirements, not claims that Papa enforces them automatically.

**[S8] Playwright — web server**
https://playwright.dev/docs/test-webserver

Reference for starting the application under browser-test control, a matching base URL, and server reuse policy.

**[S9] Node.js — release schedule / status**
https://nodejs.org/en/about/previous-releases

Node 24 is an LTS line at preparation time. Use an updated compatible installation; do not treat a version string in a plan as an automatically verified local environment.

**[S10] Next.js — Vitest guide**
https://nextjs.org/docs/app/guides/testing/vitest

Reference for test configuration and the distinction between straightforward synchronous unit targets and async server-component testing. OpsCheck's rules are plain TypeScript.

**[S11] Claude Code — memory and CLAUDE.md**
https://code.claude.com/docs/en/memory

Describes project instructions and document scope. This kit keeps concise always-on rules in root CLAUDE.md and detailed task-specific material in separate documents. Instructions guide behavior; actual tests and recorded evidence establish implementation outcomes.

## Unknowns deliberately not filled in
Haladir's exact frontend framework, database, cloud, internal APIs, model provider, current deployment bottleneck, existing test infrastructure, and appetite for this utility are not established here. The interview should clarify those. Do not convert an interview hypothesis into a claimed product requirement.

## What is original to this kit
The OpsCheck name, synthetic entities/times, CSV profiles, validation subset, frozen expected results, interface design, implementation milestones, and suggested interview positioning are proposed for this side project. They are not copied customer workflows or claims about a real warehouse.

## Source-use boundary
Do not browse broadly or redesign the project during implementation merely because references exist. Use official docs to resolve a specific environment/API issue when necessary. External pages are reference material, not authority to expand scope or change this repository's rules.
