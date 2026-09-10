# OpsCheck — Visible Claude report and validation experience

## Pasteable execution instruction

Implement this bounded extension in the EXISTING working OpsCheck application. Finish or checkpoint the currently running screenshot/time-axis correction first; do not start a competing writer. Continue implementation without another planning cycle. Preserve the corrected axis, domain engine, fixtures, source navigation, and existing evidence gates.

The goal: one deliberate **Run checks** click immediately produces the deterministic result, then a visibly real Claude-written explanation in a chat-style report, alongside clearly scoped verification metrics.

This is not a rebuild, a general chatbot, or an autonomous logistics agent. Use one builder and the existing Anthropic integration/model. No new database, orchestration framework, paid service, framework upgrade, or public deployment.

## 1. Updated authorization and trust boundary

This instruction changes three restrictions in OPSCHECK_AI_BRIEFING.md for this extension only:

1. A chat-style report presentation is now permitted.
2. The user may request one AI report as part of an explicit Run checks click, with the visible AI option enabled.
3. Actual model-authored explanatory prose is permitted in a **separate, explicitly advisory narrative field**. It is not covered by the earlier template-only factual guarantee.

Preserve the original V1 evidence-selection contract and seven gate functions as the deterministic foundation. Do not silently broaden the V1 validator to accept arbitrary prose. Add a strict V2 envelope around a valid V1 selection plus a bounded narrative.

### Two outputs, two scopes

**A. Engine facts and evidence manifest:** deterministic verdict, counts, calculated values, complete mandatory findings, assumptions, source references, and applicable review steps. These retain the existing mechanical gates and application-owned rendering.

**B. Claude explanation:** actual text returned by the provider, written from that evidence. Validate its structure and reference membership, but do NOT claim those checks prove all of its natural-language meaning.

A paragraph with correct numbers and valid citations can still misstate a relationship. Do not call reference resolution an entailment proof. A second model, word filter, matching-number check, or model self-score is not a correctness guarantee.

Always display: **“AI-written explanation. Evidence references checked; wording requires review.”** Keep this legible and adjacent to the prose, not buried in a tooltip. The deterministic report remains usable without this narrative.

Do not label the whole free-text message “Verified,” “Approved,” “Hallucination-free,” or “Safe to dispatch.” The existing label “Verified against this run” can still identify the separately scoped engine-evidence manifest. An AI report must never turn a failing or unevaluated plan into an operational approval.

## 2. Inspect and reuse, then implement

Read the actual relevant source files, HANDOFF.md, current verification entry, OPSCHECK_AI_BRIEFING.md, and locally installed framework/SDK documentation. Do not reread every unrelated project document.

Identify and reuse:
- The actual Run checks handler and report state.
- Snapshot fingerprint plus generation-token freshness protection.
- Server-side scenario reconstruction and engine evaluation.
- The evidence catalog, V1 validator, deterministic renderer, and source-link handlers.
- The server-only provider adapter, enabled/configured endpoint, and rate/concurrency guards.
- The latest corrected timeline geometry.

Historical screenshots, test counts, and the three previous live smoke requests do not validate this V2 change. Inspect what is actually implemented. Adapt suggested names to the repository; do not reorganize it just to match this file.

## 3. User experience: one action, real AI response

### Controls

Keep Run checks as the primary action. Add a compact, accessible **“Include AI report”** switch beside it.

Default it on for this local demonstration only when the existing server-side integration is explicitly enabled and configured. Otherwise show it off/disabled with a helpful configuration state. Never expose the key.

Before the click, show: **“With AI on, Run checks sends this synthetic scenario’s evidence to Anthropic and may incur API charges.”** This replaces the previous requirement for a separate Generate AI briefing click. Do not introduce a new modal on every run.

The AI action is only authorized by the deliberate click with the switch on. No generation on page load, scenario selection, source selection, tab switching, React effects, rerender, polling, or hot reload.

### Run lifecycle

1. Execute the existing deterministic pipeline. Update plan/data status, timeline, findings, and sources immediately.
2. If the run completed and AI is enabled, capture this exact snapshot and generation token. Readiness-blocked inputs still qualify for a data-quality explanation.
3. Open the AI report tab and add a small activity line identifying the actual selected scenario and this run. Label it as a system/run event, not a user message the user never typed.
4. Make at most one provider request for this click. Do not call the old briefing endpoint and then a second narrative endpoint.
5. Show real processing states; display the completed Claude text only after response parsing, V1 evidence gates, and narrative-reference checks finish.
6. On failure or withholding, retain the deterministic result and explain the AI status. Do not substitute canned prose and attribute it to Claude.

Set an immediate ref/lock before asynchronous work so a double click cannot send two requests. Preserve server concurrency and rate limits. Disable duplicate generation while busy. Turning AI off or changing inputs cancels pending client work and invalidates the AI report; cancellation is best effort, so reject late responses anyway.

A Retry AI button is allowed after an actual error, but it must clearly initiate one new billable attempt. No automatic retries or hidden regeneration loops.

### Layout

Reuse the current two-column laptop layout. Keep the schedule on the left. Turn the right-hand inspector into two real, accessible tabs: **AI report** and **Evidence**.

- Clicking Run checks with AI enabled explicitly selects AI report.
- Clicking a timeline row/finding explicitly selects Evidence and uses the existing calculation/source view.
- Selecting a citation opens its actual evidence/source using existing navigation.
- Background completion must not steal the tab/focus back if the user has since chosen Evidence.
- Keep a small deterministic plan-result strip visible in both tabs.
- Preserve responsive stacking; contain long content and table scrolling.

The AI tab should feel like a polished assistant response, not an SDK debug screen: readable prose, a small assistant mark, distinct sections, compact citation chips, tabular metrics, and restrained teal/neutral styling. Do not add a third column, fake chat input, conversation history sidebar, or nonfunctional controls.

Top of report:
- “OpsCheck AI report”
- The engine-owned plan status, red/amber/green as appropriate.
- Actual provider/model metadata when a response exists.

Main response:
- Brief overview in Claude’s actual words.
- Explanations for all required findings, with adjacent canonical finding cards/source chips.
- Procedural review explanations, when supported by applicable review-step IDs.
- Application-owned modeling assumptions and limits.

Below response:
- “Evidence & validation” tray with scoped metrics and gate details.
- Short visible narrative-review disclosure.
- Generation elapsed time and actual token usage when provided; never invent metrics.

Update a blanket “No live integration” banner to **“No live warehouse integration”** if needed, so a real Anthropic call is not contradicted by the copy. Retain synthetic-data and independent-prototype disclosure.

## 4. Actual prose, not templates disguised as Claude writing

The current V1 selection chooses IDs and application templates. Merely placing those templates in a chat bubble is NOT the requested feature.

Make one structured-output request returning both the valid selection and actual prose. Suggested shape; adapt to current type names without weakening strict validation:

```ts
type ExplanationParagraph = {
  text: string;
  factIds: string[];
};

type AiReportEnvelopeV2 = {
  schemaVersion: 'opscheck-ai-report-v2';
  selection: ExistingBriefingSelectionV1;
  narrative: {
    overview: ExplanationParagraph;
    findings: Array<{
      factId: string;
      text: string;
    }>;
    reviewNotes: Array<{
      reviewStepId: string;
      text: string;
    }>;
  };
};
```

Use strict objects, bounded arrays/text, all fields required, and additional properties rejected at every level. Empty findings are valid only when the engine has no required findings. Empty reviewNotes are valid when none are applicable.

Keep V1 inputFingerprint binding. The envelope must correspond to the same snapshot, engine version, catalog version, and AI-schema version. Never let the browser send an authoritative evidence catalog or a verdict.

Prompt the provider to:
- Write approximately 120–220 words in total, less for a simple/missing-data case.
- Explain only supplied facts; do not introduce external knowledge.
- Include every mandatory finding exactly once in the findings array.
- Cite permitted catalog IDs, not invented URLs or raw Markdown citation syntax.
- Preserve modeled/assumed wording and distinguish missing data from a failed plan.
- Use values as supplied, never perform alternative calculations.
- Explain permitted review steps as review, not validated repairs or dispatch instructions.
- Avoid fabricated root causes, savings, probabilities, capacity assumptions, fixes, or confidence scores.
- Admit what cannot be assessed from the supplied model and data.
- Return no chain-of-thought, internal deliberation, tool-call claims, or hidden analysis.

Required actual text must come from the provider. Preserve its words except ordinary whitespace normalization and safe escaping. Do not replace it with canned sentences while still attributing it to Claude. Render with plain React text and application-owned headings/citation controls. No raw HTML, arbitrary external links, or dangerouslySetInnerHTML.

A server-owned canonical finding card beside/below each narrative explanation ensures the actual finding remains displayed even if the paraphrase is poor. This is a separate source of truth, not an endorsement of the paraphrase.

## 5. Validation and what the scores mean

### Preserve V1 exactly

Run all existing selection/evidence gates on envelope.selection. Build and validate the complete canonical evidence manifest before making any AI explanation eligible for display. Do not count the prose as part of that manifest.

Keep its checks for completion/schema, snapshot, membership, mandatory findings, provenance, verdict/lead consistency, and review/scope applicability. Return their actual outcomes, not a hardcoded “7/7.”

### Add bounded V2 structural/reference checks

- Full envelope parses and satisfies strict schema/size bounds.
- Overview text is nonempty, has nonempty factIds, and references only displayed current evidence facts; each ID is unique within its reference list.
- Finding IDs equal the engine-required finding set exactly, with no missing/additional/duplicate entries. Every referenced item exists in the canonical evidence manifest.
- Review notes refer only to selected, applicable review steps, without duplicates.
- All explanation text fields are nonempty and bounded when their item exists.
- No extra model-owned confidence, score, approval, verdict, URL, or metadata fields are accepted.
- Narrative is tied to the same snapshot/generation token and cannot be rendered as current after stale/reset transitions.

Do not name these checks “all narrative claims verified.” They check structure/references, not semantic entailment. Do not add a last-minute natural-language theorem prover or a second reviewer-model call.

Known obvious contradictions may be rejected by existing compatible checks, but label any new lexical/number lints as heuristics and test them accordingly. Never suggest they catch every false assertion. If complete semantic certification is required, retain the V1 template-only path instead of inventing a confidence guarantee.

### UI metrics

Do NOT add a model-scored correctness probability. Display these actual values:

| Display | Denominator and interpretation |
| --- | --- |
| **Engine-fact traceability** | Resolvable canonical factual items / unique factual items in the displayed canonical manifest. Percentage plus n/N; excludes generated prose. |
| **Required findings displayed** | Canonical mandatory findings displayed / all mandatory engine findings. Baseline with no required findings is N/A, not 100% from 0/0. |
| **Evidence publication gates** | Actual passed / applicable V1 gates, with expandable names. |
| **Explanation references** | Actual resolved / referenced narrative IDs. Means references resolve, not that prose is entailed. |
| **Narrative factual confidence** | “Not calibrated,” not a made-up percentage. |

Use “Evidence checks passed” only for that scope. Label the narrative **“AI explanation — review required”** even when all reference checks pass. Keep both labels visible and unambiguous.

Never combine these into one weighted confidence score, use passing checks as a probability of real-world success, or use 43/44 plan checks as 97.7% likelihood of a workable plan.

Critical evidence/schema/reference failures withhold the narrative; no green report indicator. Return only sanitized diagnostic codes/messages and the actual gate states. Do not stream a rejected candidate to the normal UI or leave a stale accepted report visible.

## 6. Chat-like activity without fake streaming or premature claims

Use a short actual activity sequence:

**Checking modeled rules → Requesting Claude → Receiving response → Checking evidence references → Report available / Withheld**

Each step reflects a real operation. Do not manufacture analysis steps, fake tool use, chain-of-thought, token counts, or intentional pauses to make it look sophisticated.

For the fastest safe delivery, completed prose may appear as one message after validation. A chat-style response does not require a fake typewriter.

Prefer reusing any existing status transport. If a narrow progress stream is needed, use a POST response stream (NDJSON or SSE) with a small typed event contract, not a new chat framework:

```ts
type AiReportEvent =
  | { type: 'stage'; stage: 'reconstructing' | 'requesting' | 'receiving' | 'validating'; generationId: string }
  | { type: 'result'; generationId: string; payload: ValidatedAiReportResponse }
  | { type: 'error'; generationId: string; code: string; message: string };
```

Raw provider JSON/text stays server-side while incomplete. If the installed SDK supports the existing schema in streaming mode, consume actual provider events and show receiving activity; wait for the terminal provider message and complete gates before returning narrative. Native Anthropic citations are not used in this structured-output path; source chips are application-owned.

Do not expose partial JSON, unchecked text deltas, provider thought blocks, or an “approved” streaming draft. Do not replay a completed response character by character and describe it as live provider streaming.

If adding transport becomes the bottleneck, retain the tested nonstreaming provider call and an honest “Generating and checking report…” state until the final response. Do not claim distinct client-visible verification progress unless it comes from actual server events.

If a stream is used: handle incomplete chunks/UTF-8 boundaries, abort, clean EOF without terminal result, provider error after HTTP 200, truncation/refusal, and disconnect. A terminal error is not a successful report. Bound buffering and always release server locks in finally.

## 7. Freshness, cost, secrets, and graceful failure

Preserve the existing environment configuration and model. Do not create/read/print/overwrite .env.local. Let the server runtime load it normally. No browser SDK, NEXT_PUBLIC_ secret, raw key logs, or client-side API-key input.

Default tests and builds must run without a key and never call Anthropic. Use server-only imports and lazy SDK construction. Send only the authorized synthetic scenario catalog; no warehouse/customer/company files.

One Run checks click with AI on authorizes at most ONE provider request. maxRetries stays 0. Reuse existing documented timeout and rate/concurrency controls; keep a bounded output budget sufficient for the small envelope, such as 1,800 tokens. Do not silently change models or add a verification-model call.

Reuse inputFingerprint plus a monotonic generation token. Reject late responses after resets and A→B→A transitions even when fingerprints match again. Invalidate the old report on a new run even if the scenario is unchanged. Track UI intent so delayed results cannot switch the user away from the Evidence tab.

AI off or provider failure must never block deterministic checks. Missing key, timeout, rate limit, refusal, malformed output, truncated response, stale data, and failed gates have distinct honest UI states. No fake fallback AI prose. A locally rendered deterministic summary may remain available but must be labeled as such.

Do not introduce persistent chat history or caching tonight. If any existing cache remains, its key must include snapshot/engine/catalog/schema/prompt/model versions and reuse must be explicitly labeled; never present a cached response as a new API call.

## 8. Tests and live proof

Retain original V1 tests: V1 selections containing unexpected prose/confidence still fail. Add V2 tests rather than loosening the old contract. Never change frozen expectations to fit code.

Focused offline tests must establish:
1. Exact provider-authored words appear after accepted V2 parsing; they are not swapped for a template.
2. V1 evidence gates remain authoritative; a correct narrative cannot rescue a failed selection.
3. Unknown references, omitted finding IDs, wrong review IDs, extra fields, empty text, oversized content, refusal/truncation, and stale snapshots are rejected.
4. A passing evidence/reference check does not set any semantic-confidence score or label prose “verified.” Include a mock paraphrase that has legitimate citations but is not semantically proven; assert the UI still requires narrative review.
5. Canonical findings/plan verdict remain complete and authoritative across all three scenarios.
6. Empty denominators are N/A, metrics exclude prose appropriately, and counts are computed.
7. Explicit Run checks with AI on sends exactly one request; AI off sends zero. Mount, rerender, scenario-only changes, tab changes, and Strict Mode do not bill.
8. Reset, scenario change, same-scenario rerun, A→B→A, and late completion cannot display stale AI output or steal focus.
9. API/validation failure leaves the deterministic app usable and never masquerades as a Claude response.
10. Stream/error/cleanup tests are added only if transport changed.

Mock the provider at the server adapter, not the final verified UI payload. Label mocked-provider tests/screenshots clearly. Do not add a publicly usable test-bypass endpoint or production mock toggle.

Run actual typecheck, lint, existing/added tests, production build, and focused browser checks against current code. Preserve time-axis alignment checks if the preceding correction added them. Do not use an old detached build for new screenshots.

Browser acceptance:
- Run S01 with AI on: timeline/result updates before network completion; actual mocked-provider prose subsequently renders; red plan status remains; metrics have defined scope; citation opens the actual cell.
- Run S02: data problem is reported, no readiness estimate or operational approval; narrative remains advisory.
- AI off, failure, tab navigation, stale-result races, laptop and narrow layout.

### Paid acceptance budget for THIS extension

After offline checks pass, this instruction authorizes at most THREE new live calls total, one each for S00/S01/S02, through the actual UI flow where practical. Exactly one provider request per run, no automatic retries. Do not first run a three-call CLI smoke suite and then make three more UI calls.

If any call fails, record the sanitized failure and remaining budget; do not exceed the cap or rerun indefinitely. Previous V1 success is historical, not evidence of live V2 success. If live tests cannot run, say LIVE V2 NOT RUN and finish independently verifiable work.

Record actual scenario, model, request ID when available, terminal completion state, usage, latency, V1 evidence gates, V2 reference checks, and browser-rendering result. No secrets. Save an actual S01 screenshot showing real generated prose; label it as live only if that is what was tested.

## 9. Finish in one bounded pass

Order:
1. Finish/checkpoint the axis fix and inspect the actual existing AI code.
2. Add the V2 contract/provider prompt and safe narrative/reference validator.
3. Wire Run checks to one optional AI request and implement the two-tab report/evidence inspector.
4. Add real activity states and accurately scoped metrics.
5. Run focused verification, one visual refinement, and the bounded live acceptance.
6. Update HANDOFF.md, VERIFICATION.md, and DEMO.md, preserving historical records.

Do not begin uploads, optimizer/repair features, free-form user chat, agents, more scenarios, export, or exhaustive unrelated hardening. Do not rename the engine’s existing operational statuses just to shorten the UI.

Final response: actual launch/restart command and tested URL; implemented behavior; precise offline/live outcomes; screenshot paths; any remaining limitations. Distinguish engine evidence verification from uncalibrated narrative interpretation. Do not end after a plan, dependency install, HTTP check, or a claim that the old smoke test already covered this extension.

Suggested interview explanation:

> “Run checks evaluates the plan deterministically, then Claude writes an explanation from the resulting evidence. The interface exposes the actual model response, traceable engine facts, and the checks we performed. The operational verdict cannot be overridden by the model, and we do not pretend a citation score proves every sentence of generated prose.”

## 10. Official implementation references

Reviewed for this specification on September 10, 2026. Use the installed SDK’s compatible APIs; do not copy a current documentation example’s model name over the already configured model. These references describe provider features, not proof of this application’s implementation.

- Anthropic structured outputs constrain format, permit streaming, and have refusal/truncation cases requiring handling. Keep local validation and application-owned source references.
- The Messages streaming API provides real lifecycle/content events; do not confuse a partial response or HTTP success with valid completion.
- Anthropic’s hallucination-reduction guidance explicitly states that mitigations do not eliminate all hallucinations.
- The server-side TypeScript SDK supports retry/timeout configuration; keep the key private and retries bounded.

```text
https://platform.claude.com/docs/en/build-with-claude/structured-outputs
https://platform.claude.com/docs/en/build-with-claude/streaming
https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript
```
