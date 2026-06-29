# Conversion Rate Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the consumer-dispute site from a free solution page into a trustworthy free screening funnel with assessment numbers, limited public diagnostics, WeCom conversion, lead scoring, and an actionable admin follow-up workflow.

**Architecture:** Keep the existing Next.js App Router and SQLite/Prisma deployment. Add deterministic domain modules for assessment numbers, lead scoring, and public-result projection; persist new lead fields on `Case`; keep detailed analysis server-side; and expose only a narrow diagnostic response to the customer. Extend the existing admin workbench instead of adding a second CRM surface.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma 6 with SQLite, Zod, Vitest, DeepSeek through the OpenAI-compatible SDK, Zeabur Docker deployment.

---

## File Structure

- Create `lib/assessment-number.ts`: generate and validate customer-facing assessment numbers.
- Create `lib/lead-score.ts`: deterministic score calculation and A/B/C classification.
- Create `app/api/cases/[id]/added-wechat/route.ts`: idempotently record the customer conversion action.
- Create `tests/assessment-number.test.ts`, `tests/lead-score.test.ts`, and `tests/added-wechat-route.test.ts`.
- Modify `prisma/schema.prisma`: persist assessment, receive method, merchant, lead, and follow-up fields.
- Modify `scripts/start-production.mjs`: preserve startup-compatible schema upgrades for existing SQLite data.
- Modify `lib/schema.ts`: add intake, public-result, follow-up, and display schemas.
- Modify `lib/prompt.ts`, `lib/analysis.ts`, and `lib/public-analysis.ts`: enforce diagnosis-only AI output and a server-side public whitelist.
- Modify `app/api/analyze/route.ts`: score, number, save, notify, and return the new customer response.
- Modify `components/intake-form.tsx`: rebuild homepage modules and conditional result-receive step.
- Modify `components/analysis-report.tsx`: render the limited result and WeCom conversion actions.
- Modify `components/case-table.tsx`, `components/case-detail.tsx`, and admin pages: add lead prioritization and follow-up workflow.
- Modify `lib/case-copy.ts`, `lib/site-config.ts`, `lib/wecom-case-notification.ts`, `.env.example`, and `app/globals.css`.
- Update existing tests where the intentional public contract changes.

### Task 1: Persist the New Lead Model Safely

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `scripts/start-production.mjs`
- Modify: `tests/database-startup.test.ts`

- [ ] **Step 1: Write the failing startup migration test**

Add a test that initializes an old-form `Case` table, runs `DATABASE_INIT_ONLY=1`, and verifies the new columns exist without deleting its row:

```ts
const columns = await prisma.$queryRaw<Array<{ name: string }>>`PRAGMA table_info('Case')`;
expect(columns.map(({ name }) => name)).toEqual(expect.arrayContaining([
  "assessmentNo", "receiveMethod", "wechatId", "phone", "contactTime",
  "merchantName", "merchantPromise", "willingToSupplement", "leadScore",
  "addedWechat", "addedWechatAt"
]));
expect(await prisma.case.count()).toBe(1);
```

- [ ] **Step 2: Run the startup test and verify it fails**

Run: `npm test -- tests/database-startup.test.ts`

Expected: FAIL because the new columns do not exist.

- [ ] **Step 3: Extend the Prisma model**

Add compatible defaults so old records remain readable:

```prisma
assessmentNo         String?  @unique
receiveMethod       String   @default("legacy")
wechatId            String   @default("")
phone               String   @default("")
contactTime         String   @default("")
merchantName        String   @default("")
merchantPromise     String   @default("")
willingToSupplement String   @default("unknown")
leadScore            String   @default("C")
addedWechat          Boolean  @default(false)
addedWechatAt        DateTime?
```

Update `scripts/start-production.mjs` to run `prisma db push --skip-generate` before starting the standalone server. Keep directory creation and `DATABASE_INIT_ONLY` behavior intact.

- [ ] **Step 4: Generate Prisma and run the startup test**

Run: `npx prisma generate && npm test -- tests/database-startup.test.ts`

Expected: PASS, including preservation of the seeded legacy row.

- [ ] **Step 5: Commit the persistence layer**

```bash
git add prisma/schema.prisma scripts/start-production.mjs tests/database-startup.test.ts
git commit -m "Add conversion lead fields safely"
```

### Task 2: Add Intake Validation, Assessment Numbers, and Lead Scoring

**Files:**
- Create: `lib/assessment-number.ts`
- Create: `lib/lead-score.ts`
- Create: `tests/assessment-number.test.ts`
- Create: `tests/lead-score.test.ts`
- Modify: `lib/schema.ts`
- Modify: `tests/schema.test.ts`

- [ ] **Step 1: Write failing domain tests**

Cover number shape, receive-method validation, and score boundaries:

```ts
expect(generateAssessmentNumber(new Date("2026-06-29T01:00:00Z"), () => 0.0081))
  .toBe("11399-20260629-0081");

expect(intakeSchema.safeParse({ ...validIntake, receiveMethod: "page", contact: "" }).success)
  .toBe(true);
expect(intakeSchema.safeParse({ ...validIntake, receiveMethod: "wechat", wechatId: "" }).success)
  .toBe(false);

expect(calculateLeadScore(highIntentIntake)).toMatchObject({ grade: "A" });
expect(calculateLeadScore(mediumIntentIntake)).toMatchObject({ grade: "B" });
expect(calculateLeadScore(lowIntentIntake)).toMatchObject({ grade: "C" });
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- tests/assessment-number.test.ts tests/lead-score.test.ts tests/schema.test.ts`

Expected: FAIL because the modules and new fields are missing.

- [ ] **Step 3: Implement assessment-number generation**

```ts
export function generateAssessmentNumber(date = new Date(), random = Math.random) {
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date).replaceAll("-", "");
  const suffix = Math.min(9999, Math.max(0, Math.floor(random() * 10000)))
    .toString().padStart(4, "0");
  return `11399-${local}-${suffix}`;
}
```

The route will retry on a unique-constraint collision; this function only owns formatting.

- [ ] **Step 4: Extend `intakeSchema` with conditional validation**

Add `merchantName`, `merchantPromise`, `receiveMethod`, `wechatId`, `phone`, `contactTime`, and `willingToSupplement`. Use `superRefine`:

```ts
if (value.receiveMethod === "wechat" && !value.wechatId.trim()) {
  ctx.addIssue({ code: "custom", path: ["wechatId"], message: "请输入微信号" });
}
if (["sms", "phone"].includes(value.receiveMethod) && !/^1\d{10}$/.test(value.phone)) {
  ctx.addIssue({ code: "custom", path: ["phone"], message: "请输入有效手机号" });
}
if (value.receiveMethod === "phone" && !value.contactTime) {
  ctx.addIssue({ code: "custom", path: ["contactTime"], message: "请选择方便沟通时间" });
}
```

- [ ] **Step 5: Implement deterministic scoring**

`calculateLeadScore(intake, now)` returns `{ points, grade, reasons }`. Apply exactly the approved thresholds: `A >= 8`, `B >= 4`, otherwise `C`; calculate age using calendar dates; recognize payment evidence, supporting evidence, refusal/delay/offline/nonperformance, contact intent, supplement willingness, clear refund/termination goal, merchant detail, page-only penalty, and thin-description penalty.

- [ ] **Step 6: Run domain tests**

Run: `npm test -- tests/assessment-number.test.ts tests/lead-score.test.ts tests/schema.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the domain rules**

```bash
git add lib/assessment-number.ts lib/lead-score.ts lib/schema.ts tests/assessment-number.test.ts tests/lead-score.test.ts tests/schema.test.ts
git commit -m "Add assessment numbers and lead scoring"
```

### Task 3: Restrict AI and Public Analysis to Diagnosis

**Files:**
- Modify: `lib/schema.ts`
- Modify: `lib/prompt.ts`
- Modify: `lib/analysis.ts`
- Modify: `lib/public-analysis.ts`
- Modify: `tests/analysis.test.ts`
- Modify: `tests/public-analysis.test.ts`
- Modify: `tests/probability.test.ts`

- [ ] **Step 1: Write failing public-contract tests**

Define a public result with no probability or procedural fields:

```ts
const publicResult = toPublicAnalysis(internalAnalysis, intake);
expect(publicResult).toEqual(expect.objectContaining({
  opportunity: expect.stringMatching(/^(high|medium_high|medium|low|unclear)$/),
  evidenceCompleteness: expect.stringMatching(/^(complete|partial|insufficient|review_needed)$/),
  riskPoints: expect.any(Array),
  materialGaps: expect.any(Array),
  manualReviewRecommended: expect.any(Boolean)
}));
expect(publicResult).not.toHaveProperty("probability");
expect(publicResult).not.toHaveProperty("first_step");
expect(JSON.stringify(publicResult)).not.toContain("communication");
```

Assert `buildAnalysisPrompt()` contains all seven prohibited output classes and asks for diagnosis-only JSON.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/analysis.test.ts tests/public-analysis.test.ts tests/probability.test.ts`

Expected: FAIL because the old public schema exposes probability and steps.

- [ ] **Step 3: Replace the public schema**

Use the following contract:

```ts
export const publicAnalysisSchema = z.object({
  summary: z.string().min(1),
  opportunity: z.enum(["high", "medium_high", "medium", "low", "unclear"]),
  evidenceCompleteness: z.enum(["complete", "partial", "insufficient", "review_needed"]),
  riskPoints: z.array(z.string()).max(4),
  materialGaps: z.array(z.string()).max(4),
  manualReviewRecommended: z.boolean(),
  review_flag: modelAnalysisSchema.shape.review_flag
});
```

Keep legacy probability parsing only in internal stored-analysis normalization so old admin records still render.

- [ ] **Step 4: Harden the prompt and fallback**

Remove requests for public stage titles, detailed `next_steps`, and copy-ready communication text. Ask for `summary`, `opportunity`, `evidence_completeness`, `favorable_factors`, `adverse_factors`, `decisive_issues`, `materials`, `strategy_direction`, and `review_flag`. Explicitly prohibit templates, scripts, platform tutorials, detailed complaint steps, detailed litigation steps, and result promises.

Make the fallback derive only from submitted facts and use the same diagnostic fields.

- [ ] **Step 5: Implement the public whitelist**

`toPublicAnalysis(analysis)` must copy only summary, normalized opportunity, evidence completeness, at most four adverse/decisive risks, at most four materials, review recommendation, and flag. Do not spread the analysis object.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- tests/analysis.test.ts tests/public-analysis.test.ts tests/probability.test.ts`

Expected: PASS. Probability tests may remain for legacy/internal calculations, but no public type may depend on them.

- [ ] **Step 7: Commit the diagnostic analysis boundary**

```bash
git add lib/schema.ts lib/prompt.ts lib/analysis.ts lib/public-analysis.ts tests/analysis.test.ts tests/public-analysis.test.ts tests/probability.test.ts
git commit -m "Limit customer analysis to diagnostic output"
```

### Task 4: Save and Return the New Assessment Response

**Files:**
- Modify: `app/api/analyze/route.ts`
- Modify: `lib/wecom-case-notification.ts`
- Modify: `tests/analyze-route.test.ts`
- Modify: `tests/wecom-case-notification.test.ts`

- [ ] **Step 1: Write the failing route tests**

Mock Prisma and assert the route saves and returns the new fields:

```ts
expect(prisma.case.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
  assessmentNo: expect.stringMatching(/^11399-\d{8}-\d{4}$/),
  receiveMethod: "wechat",
  merchantName: "某培训机构",
  leadScore: "A"
}) }));
expect(body).toEqual(expect.objectContaining({
  assessmentNo: expect.stringMatching(/^11399-/),
  leadScore: "A",
  analysis: expect.not.objectContaining({ probability: expect.anything() })
}));
```

Add a collision test where the first create throws Prisma `P2002` and the second succeeds.

- [ ] **Step 2: Run route tests and verify failure**

Run: `npm test -- tests/analyze-route.test.ts tests/wecom-case-notification.test.ts`

Expected: FAIL because the route does not generate or save assessment metadata.

- [ ] **Step 3: Implement score, retry, persistence, and response**

Calculate the score before saving. Generate the assessment number inside a maximum five-attempt loop, retry only `P2002`, and rethrow other errors. Save dynamic contact fields, merchant fields, supplement willingness, score, analysis, and review flag. Return `{ id, assessmentNo, leadScore, analysis }`.

- [ ] **Step 4: Extend the new-case notification**

Include assessment number, lead grade, receive-method label, amount, scenario, and admin detail URL. Do not include phone, WeChat ID, merchant promise, or full case narrative in the robot message.

- [ ] **Step 5: Run route and notification tests**

Run: `npm test -- tests/analyze-route.test.ts tests/wecom-case-notification.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit assessment creation**

```bash
git add app/api/analyze/route.ts lib/wecom-case-notification.ts tests/analyze-route.test.ts tests/wecom-case-notification.test.ts
git commit -m "Save scored customer assessments"
```

### Task 5: Rebuild the Customer Intake Funnel

**Files:**
- Modify: `components/intake-form.tsx`
- Modify: `app/globals.css`
- Modify: `tests/customer-intake.test.tsx`

- [ ] **Step 1: Write failing render and interaction-contract tests**

Assert the new title, trust modules, merchant fields, receive methods, exact CTA, and disclaimer. Extract the conditional receive-field decision to an exported pure helper so Vitest can test it without a browser:

```ts
expect(getReceiveFieldVisibility("wechat")).toEqual({ wechat: true, phone: false, contactTime: false });
expect(getReceiveFieldVisibility("phone")).toEqual({ wechat: false, phone: true, contactTime: true });
expect(html).toContain("先判断能不能退，再决定怎么处理");
expect(html).toContain("开始免费案情初筛");
expect(html).toContain("接收你的免费评估结果");
expect(html).toContain("生成我的免费评估结果");
```

- [ ] **Step 2: Run the intake test and verify failure**

Run: `npm test -- tests/customer-intake.test.tsx`

Expected: FAIL on the old title and missing receive fields.

- [ ] **Step 3: Implement the balanced-trust page structure**

Replace the hero and applicability block with: hero, trust explanation, self-complaint failure reasons, screening scope, and five-step submission flow. Put the form after these modules and add an anchor CTA to it.

- [ ] **Step 4: Add merchant and conditional receive fields**

Extend form state and payload. Render radio-style receive options. For `page`, leave `contact`, `wechatId`, and `phone` empty; for other methods derive legacy `contact` from the relevant value. Preserve all entered state after server errors.

- [ ] **Step 5: Update loading and completion behavior**

Disable duplicate submits, label the loading state “正在生成初步评估…”, pass `assessmentNo`, `leadScore`, and `caseId` to `AnalysisReport`, and scroll the result into view only after success using a stable result ref.

- [ ] **Step 6: Implement mobile-first styles**

Use deep green, warm orange, and warm neutral variables. Keep the main CTA visually unique, use 44px minimum controls, make choice blocks one column on narrow screens, and remove English eyebrow labels from customer-facing sections.

- [ ] **Step 7: Run the intake test**

Run: `npm test -- tests/customer-intake.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit the intake funnel**

```bash
git add components/intake-form.tsx app/globals.css tests/customer-intake.test.tsx
git commit -m "Rebuild customer screening funnel"
```

### Task 6: Build the Conversion-Focused Result and Added-WeChat Action

**Files:**
- Modify: `components/analysis-report.tsx`
- Create: `app/api/cases/[id]/added-wechat/route.ts`
- Modify: `lib/site-config.ts`
- Modify: `.env.example`
- Create: `tests/added-wechat-route.test.ts`
- Modify: `tests/analysis-report.test.tsx`

- [ ] **Step 1: Write failing result-page tests**

```ts
expect(html).toContain("你的初步评估已生成");
expect(html).toContain("评估编号：11399-20260629-0081");
expect(html).toContain("处理机会");
expect(html).toContain("证据完整度");
expect(html).toContain("建议先做一次人工复核");
expect(html).toContain("添加企业微信，免费复核");
expect(html).not.toContain("概率");
expect(html).not.toContain("第 1 步");
expect(html).not.toContain("后续阶段");
```

Test the action route returns 200 twice, while Prisma sets `addedWechat: true` and only sets `addedWechatAt` on the first transition.

- [ ] **Step 2: Run result and action tests and verify failure**

Run: `npm test -- tests/analysis-report.test.tsx tests/added-wechat-route.test.ts`

Expected: FAIL because the result still exposes probability and the route does not exist.

- [ ] **Step 3: Implement the new result hierarchy**

Render assessment header, opportunity/evidence/current-advice summary, diagnostic summary, up to four risk points, up to four material gaps, and the manual-review invitation. Use grade-specific copy without exposing points. The primary `<a>` opens `NEXT_PUBLIC_CONSULTATION_URL`; the copy button copies only the assessment number.

- [ ] **Step 4: Add the customer conversion action**

The route accepts only `POST`, looks up the case by both `id` and public `assessmentNo` supplied in JSON, and performs an idempotent update. It returns `{ addedWechat: true }` without case data. In the component, show “已提醒老师，请在企业微信发送评估编号” after success.

- [ ] **Step 5: Add configuration and responsive CTA styles**

Keep `NEXT_PUBLIC_CONSULTATION_URL` as the primary direct link. Add `CUSTOMER_SERVICE_WECHAT=` to `.env.example` and expose it only through a server-safe helper for future use; do not render it when empty. Add a mobile fixed bar with bottom safe-area padding.

- [ ] **Step 6: Run result and action tests**

Run: `npm test -- tests/analysis-report.test.tsx tests/added-wechat-route.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the conversion result**

```bash
git add components/analysis-report.tsx app/api/cases/[id]/added-wechat/route.ts lib/site-config.ts .env.example app/globals.css tests/analysis-report.test.tsx tests/added-wechat-route.test.ts
git commit -m "Turn assessment results into manual review conversion"
```

### Task 7: Upgrade the Admin Lead Workbench

**Files:**
- Modify: `app/(admin)/cases/page.tsx`
- Modify: `app/(admin)/cases/[id]/page.tsx`
- Modify: `app/api/cases/[id]/route.ts`
- Modify: `components/case-table.tsx`
- Modify: `components/case-detail.tsx`
- Modify: `lib/schema.ts`
- Modify: `lib/case-copy.ts`
- Modify: `app/globals.css`
- Modify: `tests/case-workbench.test.ts`
- Modify: `tests/case-detail.test.tsx`
- Modify: `tests/case-copy.test.ts`
- Modify: `tests/admin-api-auth.test.ts`

- [ ] **Step 1: Write failing admin tests**

Assert sorting and follow-up values:

```ts
expect(filterAndSortCases([cCase, aOld, aNew, bCase], "all", "all").map(x => x.id))
  .toEqual(["a-new", "a-old", "b", "c"]);
expect(caseUpdateSchema.parse({ status: "strong_interest", operatorNotes: "已约复核" }))
  .toEqual({ status: "strong_interest", operatorNotes: "已约复核" });
```

Assert the table and detail include assessment number, receive method, lead grade, added-WeChat state, merchant facts, and copied follow-up summary.

- [ ] **Step 2: Run admin tests and verify failure**

Run: `npm test -- tests/case-workbench.test.ts tests/case-detail.test.tsx tests/case-copy.test.ts tests/admin-api-auth.test.ts`

Expected: FAIL because the new grades and statuses are not represented.

- [ ] **Step 3: Extend follow-up statuses and labels**

Replace the status enum with:

```ts
z.enum(["uncontacted", "wechat_added", "no_answer", "communicated",
  "strong_interest", "not_now", "converted", "invalid"])
```

Map legacy statuses to readable labels without rewriting old records.

- [ ] **Step 4: Rebuild list prioritization and responsive presentation**

Sort by `{ A: 3, B: 2, C: 1 }`, then `createdAt` descending. Add grade and status filters. Desktop table columns: assessment/customer, grade, receive method, dispute/amount, added state, follow-up, submitted time. Under the mobile breakpoint, render the same records as stacked cards with the primary facts visible without horizontal scrolling.

- [ ] **Step 5: Extend detail editing and internal copy**

Pass all new fields from the server page. Show receive details only in admin, render merchant name/promise and lead reasons, allow status and notes updates, and preserve the mobile back button. Update `buildInternalCaseSummary()` to include assessment number, grade, receive details, added status, full intake, internal analysis, follow-up state, and notes in labeled sections.

- [ ] **Step 6: Run admin tests**

Run: `npm test -- tests/case-workbench.test.ts tests/case-detail.test.tsx tests/case-copy.test.ts tests/admin-api-auth.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the admin workflow**

```bash
git add app/'(admin)'/cases app/api/cases components/case-table.tsx components/case-detail.tsx lib/schema.ts lib/case-copy.ts app/globals.css tests/case-workbench.test.ts tests/case-detail.test.tsx tests/case-copy.test.ts tests/admin-api-auth.test.ts
git commit -m "Prioritize and manage conversion leads"
```

### Task 8: Full Regression, Browser QA, and Production Deployment

**Files:**
- Modify if needed: `README.md`
- Modify if needed: `docs/deploy-zeabur.md`

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all test files and tests PASS with zero failures.

- [ ] **Step 2: Run static verification**

Run: `npm run lint && npm run build && git diff --check`

Expected: all commands exit 0 and no whitespace errors are reported.

- [ ] **Step 3: Start the production-like app locally**

Run: `npm run dev`

Expected: Next.js reports a local URL and no startup error.

- [ ] **Step 4: Browser-test desktop and mobile customer flows**

Verify through the in-app browser:

- New hero and all three trust modules appear before the form.
- Each receive method reveals only its intended fields.
- Page-only submission works without contact details.
- A realistic submission produces an assessment number and limited result.
- Result contains no probability, template, detailed process, or contact data.
- Enterprise WeChat link points to the configured URL.
- Copy assessment number and added-WeChat state work.
- At 390px width, controls remain readable and the fixed CTA does not cover content.

- [ ] **Step 5: Browser-test the admin workflow**

Log in locally, verify A/B/C ordering, filters, assessment lookup, added state, all follow-up statuses, notes persistence, back navigation, and one-click internal copy on desktop and 390px mobile.

- [ ] **Step 6: Commit any QA-only corrections**

```bash
git add -A
git commit -m "Polish conversion workflow after browser QA"
```

Skip this commit only when `git status --short` is empty.

- [ ] **Step 7: Push and deploy**

Run: `git push origin main`, then trigger Zeabur redeploy for the `consumer-rights-review` GitHub service. Confirm the deployment source commit matches local `HEAD`; do not use a local-image/manual deployment.

- [ ] **Step 8: Verify production**

Check `https://consumer-rights-review.zeabur.app/`, `/admin/login`, a real non-sensitive test submission, the admin case record, the enterprise WeChat target, and the added-WeChat action. Verify browser console has no errors and Zeabur runtime logs show the correct `ai-claim-review` service.

- [ ] **Step 9: Report completion evidence**

Record test count, lint/build status, deployed commit, customer URL, admin URL, and any remaining operational limitation such as SMS not being sent automatically.
