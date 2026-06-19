# Smart Claim Intake Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the static claim diagnosis page into a customer-facing smart pre-assessment flow with higher-signal intake questions and more professional initial analysis output.

**Architecture:** Keep the site as a static HTML/CSS/JS bundle, but replace operator-facing sections with a cleaner intake/report split. Move the data model from sales-oriented options to fact-based intake fields and update the scoring/rendering logic so the output reads like an initial case review rather than a conversion panel.

**Tech Stack:** HTML, CSS, vanilla JavaScript

---

### Task 1: Restructure customer-facing page content

**Files:**
- Modify: `outputs/consumer-rights-review-site/index.html`
- Test: `outputs/consumer-rights-review-site/index.html`

- [ ] Replace hero, intake, and report sections with customer-facing copy and fields for transaction facts, dispute core, progress, evidence, and goals.
- [ ] Remove operator-only modules such as funnel guidance, lead history, and conversion language.
- [ ] Add placeholders and helper text that keep the form fillable within roughly three minutes.

### Task 2: Refresh styles for the new intake/report layout

**Files:**
- Modify: `outputs/consumer-rights-review-site/styles.css`
- Test: `outputs/consumer-rights-review-site/styles.css`

- [ ] Adjust layout and component styles for the new field groups, conditional question panels, and report cards.
- [ ] Remove styles that only support deleted sales panels and history modules.
- [ ] Preserve responsive behavior for desktop and mobile widths.

### Task 3: Replace the data model and assessment logic

**Files:**
- Modify: `outputs/consumer-rights-review-site/data.js`
- Modify: `outputs/consumer-rights-review-site/app.js`
- Test: `outputs/consumer-rights-review-site/app.js`

- [ ] Redefine option sets around factual intake data such as payment method, issue types, evidence categories, obstacles, and scenario-specific follow-up questions.
- [ ] Rewrite form reading, conditional field visibility, validation, and demo data loading to match the new structure.
- [ ] Replace sales-oriented output with an initial review summary, strengths, missing items, next actions, and a communication suggestion.

### Task 4: Verify the static bundle

**Files:**
- Test: `outputs/consumer-rights-review-site/index.html`
- Test: `outputs/consumer-rights-review-site/app.js`

- [ ] Run JavaScript syntax checks to catch implementation errors.
- [ ] Open the updated local bundle in the browser and verify the main flow manually with the demo case.
- [ ] Report the new preview path and any remaining limitations clearly.
