# Customer Entry Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant pre-form content so mobile customers reach the assessment form faster.

**Architecture:** Keep the existing `IntakeForm` data flow intact and only simplify its pre-form presentation. Use a source-level regression test for removed and retained copy, then tighten the existing responsive CSS for the retained scenario section.

**Tech Stack:** Next.js 15, React 19, CSS, Vitest

---

### Task 1: Lock the simplified content contract

**Files:**
- Modify: `tests/customer-intake.test.tsx`

- [ ] **Step 1: Write the failing regression test**

Add a test that reads `components/intake-form.tsx` and asserts that `先看退费空间`, `为什么自己投诉后还是没结果`, and `submission-flow` are absent while `适合以下情况`, `生成我的免费评估结果`, and the disclaimer remain present.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/customer-intake.test.tsx`

Expected: FAIL because the redundant modules are still rendered.

### Task 2: Remove redundant modules and compact the retained entry

**Files:**
- Modify: `components/intake-form.tsx`
- Modify: `app/globals.css`
- Test: `tests/customer-intake.test.tsx`

- [ ] **Step 1: Remove unused content constants**

Delete `trustModules`, `failureReasons`, and the five-step flow data if it is stored as a constant.

- [ ] **Step 2: Remove redundant JSX**

Delete the trust-card grid, complaint-failure explanation, and submission-flow sections. Keep the hero, compact applicable-scenarios section, intake form, result panel, and disclaimer.

- [ ] **Step 3: Tighten retained scenario spacing**

Reduce the applicable-scenario section padding and card gaps on desktop and mobile without changing colors or form styling. Remove CSS selectors that are now unused only when they are specific to the deleted modules.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/customer-intake.test.tsx tests/analysis-report.test.tsx`

Expected: both files pass.

- [ ] **Step 5: Commit implementation**

```bash
git add components/intake-form.tsx app/globals.css tests/customer-intake.test.tsx
git commit -m "Simplify customer assessment entry"
```

### Task 3: Verify and deploy

**Files:**
- No additional source files expected.

- [ ] **Step 1: Run full verification**

Run: `npm test && npm run lint && npm run build && git diff --check`

Expected: all tests pass, ESLint reports no errors, and the production build exits successfully.

- [ ] **Step 2: Verify mobile rendering**

Start the production build and inspect `/` at 390x844. Confirm `document.documentElement.scrollWidth` equals the viewport width and the form begins shortly after the compact scenario section.

- [ ] **Step 3: Push and verify production**

Push `main`, redeploy the existing Zeabur service if its Git trigger does not update automatically, and verify the deleted copy is absent from `https://consumer-rights-review.zeabur.app/`.
