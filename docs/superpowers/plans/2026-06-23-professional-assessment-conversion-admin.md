# Professional Assessment, Conversion, and Admin Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add defensible dual probability ranges, improve case-specific analysis, expose only limited customer guidance, strengthen the consultation CTA, and add mobile-safe admin back/copy actions.

**Architecture:** Store one complete internal analysis in the existing JSON database field, then derive an allowlisted public result before responding to customers. Compute probability ranges with deterministic rules plus capped structured model factors; keep UI and clipboard formatting in separate focused modules.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zod, Prisma/SQLite JSON, DeepSeek through the OpenAI SDK, Vitest, CSS

---

## File Map

- Modify `lib/schema.ts`: define model analysis, internal analysis, public analysis, probability ranges, and stored-analysis compatibility.
- Create `lib/probability.ts`: deterministic dual-range calculation.
- Modify `lib/prompt.ts`: request case-specific structured analysis without model-generated percentages.
- Modify `lib/analysis.ts`: parse the new model shape, calculate probabilities, and provide a professional fallback.
- Create `lib/public-analysis.ts`: allowlist and reduce internal analysis for customer responses.
- Modify `app/api/analyze/route.ts`: save internal analysis and return only public analysis.
- Modify `components/intake-form.tsx`: use the public result type.
- Modify `components/analysis-report.tsx`: render probabilities, limited steps, and new consultation copy.
- Modify `lib/site-config.ts`: change the CTA label.
- Create `lib/case-copy.ts`: format a complete internal case summary.
- Modify `components/case-detail.tsx`: add back/copy controls and render new internal fields with legacy compatibility.
- Modify `app/(admin)/cases/[id]/page.tsx`: pass submission time to the detail component.
- Modify `app/globals.css`: probability, CTA, sticky mobile bar, and admin action styles.

### Task 1: Define and calculate dual probability ranges

**Files:**
- Modify: `lib/schema.ts`
- Create: `lib/probability.ts`
- Create: `tests/probability.test.ts`

- [ ] **Step 1: Write failing probability tests**

Create `tests/probability.test.ts` with a complete intake factory and these assertions:

```ts
import { describe, expect, it } from "vitest";
import { calculateProbabilityAssessment } from "../lib/probability";
import type { IntakeInput } from "../lib/schema";

const intake = (overrides: Partial<IntakeInput> = {}): IntakeInput => ({
  clientName: "测试客户",
  contact: "test-contact",
  scenario: "education",
  amount: 6800,
  purchaseDate: "2026-06-01",
  paymentMethod: "full",
  stage: "negotiating",
  issues: ["misrepresentation", "refuse_refund"],
  evidence: ["payment", "contract", "chat", "promo"],
  obstacles: [],
  goal: "full_refund",
  summary: "宣传承诺与实际服务不一致",
  ...overrides
});

describe("probability assessment", () => {
  it("returns stable bounded ranges in the correct order", () => {
    const first = calculateProbabilityAssessment(intake(), {
      favorableCount: 3,
      adverseCount: 1,
      decisiveIssueCount: 1
    });
    const second = calculateProbabilityAssessment(intake(), {
      favorableCount: 3,
      adverseCount: 1,
      decisiveIssueCount: 1
    });

    expect(first).toEqual(second);
    expect(first.full_success.min).toBeGreaterThanOrEqual(0);
    expect(first.substantive_result.max).toBeLessThanOrEqual(95);
    expect(first.full_success.min).toBeLessThan(first.full_success.max);
    expect(first.full_success.max).toBeLessThanOrEqual(first.substantive_result.max);
  });

  it("widens and lowers ranges when key evidence is missing", () => {
    const complete = calculateProbabilityAssessment(intake(), {
      favorableCount: 2,
      adverseCount: 1,
      decisiveIssueCount: 1
    });
    const incomplete = calculateProbabilityAssessment(
      intake({ evidence: ["payment"], obstacles: ["missing_evidence"] }),
      { favorableCount: 2, adverseCount: 1, decisiveIssueCount: 1 }
    );

    expect(incomplete.substantive_result.max).toBeLessThan(
      complete.substantive_result.max
    );
    expect(incomplete.substantive_result.max - incomplete.substantive_result.min)
      .toBeGreaterThan(complete.substantive_result.max - complete.substantive_result.min);
  });

  it("caps model factor influence", () => {
    const normal = calculateProbabilityAssessment(intake(), {
      favorableCount: 3,
      adverseCount: 0,
      decisiveIssueCount: 0
    });
    const excessive = calculateProbabilityAssessment(intake(), {
      favorableCount: 99,
      adverseCount: 0,
      decisiveIssueCount: 0
    });

    expect(excessive).toEqual(normal);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/probability.test.ts`

Expected: FAIL because `lib/probability.ts` does not exist.

- [ ] **Step 3: Add probability schemas**

Add to `lib/schema.ts`:

```ts
export const probabilityRangeSchema = z.object({
  min: z.number().int().min(0).max(95),
  max: z.number().int().min(0).max(95)
});

export const probabilityAssessmentSchema = z.object({
  full_success: probabilityRangeSchema,
  substantive_result: probabilityRangeSchema,
  confidence: z.enum(["limited", "moderate", "strong"]),
  factors: z.array(z.string())
});

export type ProbabilityAssessment = z.infer<typeof probabilityAssessmentSchema>;
```

- [ ] **Step 4: Implement deterministic calculation**

Create `lib/probability.ts` with pure helpers `clamp`, `makeRange`, and:

```ts
import type {
  IntakeInput,
  ProbabilityAssessment
} from "./schema";

type ModelFactorCounts = {
  favorableCount: number;
  adverseCount: number;
  decisiveIssueCount: number;
};

const evidenceWeights: Record<string, [number, number]> = {
  payment: [7, 6],
  contract: [8, 7],
  chat: [7, 6],
  promo: [6, 5],
  invoice: [4, 3],
  recording: [4, 3]
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function makeRange(center: number, width: number) {
  const min = clamp(center - Math.ceil(width / 2), 0, 94);
  const max = clamp(Math.max(min + 6, center + Math.floor(width / 2)), 6, 95);
  return { min, max };
}

export function calculateProbabilityAssessment(
  intake: IntakeInput,
  model: ModelFactorCounts
): ProbabilityAssessment {
  let substantive = 38;
  let full = 24;
  const factors: string[] = [];
  const evidence = new Set(intake.evidence);
  const obstacles = new Set(intake.obstacles.map((value) => value.toLowerCase()));

  for (const [item, [substantiveWeight, fullWeight]] of Object.entries(evidenceWeights)) {
    if (evidence.has(item)) {
      substantive += substantiveWeight;
      full += fullWeight;
    }
  }

  if (evidence.size >= 4) factors.push("现有核心材料相对完整");
  if (intake.issues.includes("nonperformance")) {
    substantive += 5;
    full += 3;
    factors.push("存在服务未履行事实");
  }
  if (intake.issues.includes("misrepresentation")) {
    substantive += 4;
    full += 3;
    factors.push("存在宣传或承诺争议");
  }
  if (intake.paymentMethod === "installment") {
    substantive -= 4;
    full -= 7;
    factors.push("涉及分期或贷款安排");
  }
  if (intake.stage === "deadlock") {
    substantive -= 8;
    full -= 10;
    factors.push("多轮沟通后仍无进展");
  }
  if (obstacles.has("missing_evidence") || obstacles.has("missingevidence")) {
    substantive -= 10;
    full -= 12;
    factors.push("关键材料仍不完整");
  }
  if (obstacles.has("platform_rejected") || obstacles.has("platformrejected")) {
    substantive -= 8;
    full -= 10;
    factors.push("平台处理已受阻");
  }
  if (obstacles.has("merchant_offline") || obstacles.has("merchantoffline")) {
    substantive -= 8;
    full -= 10;
    factors.push("商家存在失联风险");
  }
  if (intake.amount >= 10000) {
    substantive -= 2;
    full -= 4;
    factors.push("争议金额较高");
  }

  const favorable = Math.min(3, Math.max(0, model.favorableCount));
  const adverse = Math.min(3, Math.max(0, model.adverseCount));
  const decisive = Math.min(3, Math.max(0, model.decisiveIssueCount));
  substantive += favorable * 2 - adverse * 2 - decisive;
  full += favorable * 2 - adverse * 2 - decisive;

  const missingKeyEvidence =
    evidence.size < 2 || obstacles.has("missing_evidence") || obstacles.has("missingevidence");
  const width = missingKeyEvidence ? 24 : evidence.size >= 4 ? 12 : 18;
  const substantiveRange = makeRange(substantive, width);
  const fullRange = makeRange(Math.min(full, substantive - 8), width);

  return {
    full_success: {
      min: Math.min(fullRange.min, substantiveRange.min),
      max: Math.min(fullRange.max, substantiveRange.max)
    },
    substantive_result: substantiveRange,
    confidence: missingKeyEvidence ? "limited" : evidence.size >= 4 ? "strong" : "moderate",
    factors: factors.slice(0, 5)
  };
}
```

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- tests/probability.test.ts tests/schema.test.ts`

Expected: PASS.

```bash
git add lib/schema.ts lib/probability.ts tests/probability.test.ts
git commit -m "Add bounded dual outcome probabilities"
```

### Task 2: Produce case-specific internal analysis

**Files:**
- Modify: `lib/schema.ts`
- Modify: `lib/prompt.ts`
- Modify: `lib/analysis.ts`
- Modify: `tests/analysis.test.ts`

- [ ] **Step 1: Write failing structure and prompt tests**

Update `tests/analysis.test.ts` so a valid model response requires:

```ts
const parsed = modelAnalysisSchema.parse({
  summary: "本案涉及12,800元教培分期，争议集中在宣传承诺与实际服务不一致。",
  favorable_factors: ["付款记录和沟通记录能够对应交易事实"],
  adverse_factors: ["关键宣传页面尚未完整保存"],
  decisive_issues: ["能否证明报名时的具体退款承诺"],
  strategy: "先固定宣传承诺与实际履行差异，再确定协商和投诉顺序。",
  next_steps: ["整理付款、合同和承诺截图并按时间排序", "核对合同退款条款", "形成正式沟通方案"],
  public_stage_titles: ["核对合同和承诺材料", "评估后续处理路径"],
  materials: ["报名页面及退款承诺截图"],
  communication: "完整内部沟通建议",
  review_flag: "contact_soon"
});
expect(parsed.decisive_issues).toHaveLength(1);
```

Assert the prompt contains `12,800`, the normalized scenario/stage, `不得输出成功概率`, `禁止使用固定开头`, and every new JSON field name. Assert it does not contain the customer's contact value.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/analysis.test.ts`

Expected: FAIL because `modelAnalysisSchema` and the new prompt fields do not exist.

- [ ] **Step 3: Define the internal analysis schemas**

In `lib/schema.ts`, define:

```ts
export const modelAnalysisSchema = z.object({
  summary: z.string().min(1),
  favorable_factors: z.array(z.string()).min(1),
  adverse_factors: z.array(z.string()).min(1),
  decisive_issues: z.array(z.string()).min(1),
  strategy: z.string().min(1),
  next_steps: z.array(z.string()).min(2),
  public_stage_titles: z.array(z.string()).min(1).max(4),
  materials: z.array(z.string()).min(1),
  communication: z.string().min(1),
  review_flag: z.enum(["self_service", "manual_review", "contact_soon", "complex_high_risk"])
});

export const analysisOutputSchema = modelAnalysisSchema.extend({
  probability: probabilityAssessmentSchema
});

export type ModelAnalysis = z.infer<typeof modelAnalysisSchema>;
export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
```

Keep a `legacyAnalysisOutputSchema` for old records with `summary`, `basis`, `risks`, `next_steps`, `materials`, `communication`, and `review_flag`.

- [ ] **Step 4: Rewrite the prompt around case reasoning**

Update `buildAnalysisPrompt` to remove `clientName` and `contact` from the serialized input, request the exact `modelAnalysisSchema` fields, prohibit percentages and stock openings, and require each factor to connect to a submitted fact. Keep the existing no-fabrication and no-result-promise rules.

- [ ] **Step 5: Enrich parsed and fallback analysis with probability**

In `lib/analysis.ts`:

```ts
function attachProbability(intake: IntakeInput, analysis: ModelAnalysis): AnalysisOutput {
  return {
    ...applyReviewFlagPolicy(intake, analysis),
    probability: calculateProbabilityAssessment(intake, {
      favorableCount: analysis.favorable_factors.length,
      adverseCount: analysis.adverse_factors.length,
      decisiveIssueCount: analysis.decisive_issues.length
    })
  };
}
```

Change `applyReviewFlagPolicy` to accept and return `ModelAnalysis`, update normalization aliases for old model field names, parse with `modelAnalysisSchema`, and return `attachProbability(...)`. Rewrite the local fallback to mention the actual scenario, amount, stage, available evidence, and goal without the old repeated opening.

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- tests/analysis.test.ts tests/probability.test.ts`

Expected: PASS.

```bash
git add lib/schema.ts lib/prompt.ts lib/analysis.ts tests/analysis.test.ts
git commit -m "Make case analysis specific and structured"
```

### Task 3: Enforce the customer/internal response boundary

**Files:**
- Create: `lib/public-analysis.ts`
- Create: `tests/public-analysis.test.ts`
- Modify: `app/api/analyze/route.ts`
- Modify: `tests/analyze-route.test.ts`
- Modify: `components/intake-form.tsx`

- [ ] **Step 1: Write failing public-result tests**

Create `tests/public-analysis.test.ts` and pass a full internal analysis containing sentinel strings such as `INTERNAL_STRATEGY`, `FULL_SCRIPT`, and `PRIVATE_STEP`. Assert:

```ts
const result = toPublicAnalysis(internalAnalysis);
expect(result.first_step).toBe(internalAnalysis.next_steps[0]);
expect(result.later_stage_titles).toEqual(internalAnalysis.public_stage_titles);
expect(JSON.stringify(result)).not.toContain("INTERNAL_STRATEGY");
expect(JSON.stringify(result)).not.toContain("FULL_SCRIPT");
expect(JSON.stringify(result)).not.toContain("PRIVATE_STEP");
expect(Object.keys(result).sort()).toEqual([
  "adverse_factors",
  "favorable_factors",
  "first_step",
  "later_stage_titles",
  "materials",
  "probability",
  "review_flag",
  "summary"
].sort());
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/public-analysis.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the allowlisted public type and converter**

In `lib/schema.ts`, define `publicAnalysisSchema` with only the eight fields asserted above. Create `lib/public-analysis.ts`:

```ts
import type { AnalysisOutput, PublicAnalysis } from "./schema";

export function toPublicAnalysis(analysis: AnalysisOutput): PublicAnalysis {
  return {
    summary: analysis.summary,
    favorable_factors: analysis.favorable_factors.slice(0, 3),
    adverse_factors: analysis.adverse_factors.slice(0, 3),
    first_step: analysis.next_steps[0],
    later_stage_titles: analysis.public_stage_titles,
    materials: analysis.materials.slice(0, 5),
    probability: analysis.probability,
    review_flag: analysis.review_flag
  };
}
```

- [ ] **Step 4: Change the API and form result type**

In `app/api/analyze/route.ts`, keep `analysis` in Prisma but return `analysis: toPublicAnalysis(analysis)`. Update the route test to assert the database receives the full analysis while the response equals the public result and excludes strategy, communication, and later internal steps. Change `components/intake-form.tsx` state/cast from `AnalysisOutput` to `PublicAnalysis`.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- tests/public-analysis.test.ts tests/analyze-route.test.ts tests/customer-intake.test.tsx`

Expected: PASS.

```bash
git add lib/schema.ts lib/public-analysis.ts tests/public-analysis.test.ts app/api/analyze/route.ts tests/analyze-route.test.ts components/intake-form.tsx
git commit -m "Separate public and internal case analysis"
```

### Task 4: Redesign the customer result and consultation conversion

**Files:**
- Modify: `components/analysis-report.tsx`
- Modify: `lib/site-config.ts`
- Modify: `app/globals.css`
- Modify: `tests/analysis-report.test.tsx`

- [ ] **Step 1: Write failing customer-page tests**

Update the sample result to `PublicAnalysis`, then assert the rendered output contains:

```ts
expect(html).toContain("达成全部诉求概率");
expect(html).toContain("取得实质处理结果概率");
expect(html).toContain("30%–45%");
expect(html).toContain("55%–70%");
expect(html).toContain("第 1 步");
expect(html).toContain("后续阶段");
expect(html).not.toContain("完整内部沟通建议");
expect(html).toContain("你的初步结果已生成");
expect(html).toContain("进一步核对退款空间和处理重点");
expect(html.match(/添加顾问继续评估/g)?.length).toBe(3);
```

Assert CSS contains `--signal`, `.probability-grid`, `.consultation-link`, and a mobile `.mobile-consultation-bar` rule.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/analysis-report.test.tsx`

Expected: FAIL on the new probability and CTA content.

- [ ] **Step 3: Implement the public result layout**

Change `AnalysisReport` to accept `PublicAnalysis`. Add a probability card with two ranges and the non-promise explanation. Render `first_step` as the only detailed action, then render `later_stage_titles` as high-level stage rows. Remove the customer communication card. Keep favorable factors, adverse factors, and materials.

Set `consultationLabel = "添加顾问继续评估"`. Use the confirmed title and description in both desktop consultation cards, and render one mobile-only bottom consultation bar linked to the same URL. The mobile bar remains in the markup but is hidden above the mobile breakpoint, so static markup contains three CTA links while desktop users see two.

- [ ] **Step 4: Add high-contrast responsive styles**

Add `--signal: #d8512f` and `--signal-dark: #a93620`. Use the signal color for consultation buttons, with a darker hover/focus state and visible focus outline. Add probability range cards and reserve bottom padding under `760px` when the mobile bar is present so it cannot cover the disclaimer.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- tests/analysis-report.test.tsx tests/customer-intake.test.tsx`

Expected: PASS.

```bash
git add components/analysis-report.tsx lib/site-config.ts app/globals.css tests/analysis-report.test.tsx
git commit -m "Focus customer results on assessment and consultation"
```

### Task 5: Add admin compatibility, back navigation, and copy formatting

**Files:**
- Create: `lib/case-copy.ts`
- Create: `tests/case-copy.test.ts`
- Modify: `components/case-detail.tsx`
- Modify: `app/(admin)/cases/[id]/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/case-detail.test.tsx`

- [ ] **Step 1: Write failing copy and legacy tests**

Create `tests/case-copy.test.ts` with a complete internal analysis and assert `buildInternalCaseSummary` contains the case ID, submitted time, status, risk, customer contact, transaction data, both probability ranges, all factors, strategy, numbered steps, communication, and operator notes. Assert headings appear in the required order.

Update `tests/case-detail.test.tsx` to assert `href="/cases"`, `返回案件列表`, `一键复制内部案件摘要`, both probability labels, and that the old analysis fixture still renders with `尚未评估`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/case-copy.test.ts tests/case-detail.test.tsx`

Expected: FAIL because the formatter and controls do not exist.

- [ ] **Step 3: Implement stored-analysis compatibility**

Add `normalizeStoredAnalysis(value: unknown)` in `lib/schema.ts`. It returns a discriminated display object: new analysis fields when `analysisOutputSchema` parses; legacy fields mapped as `favorable_factors = basis`, `adverse_factors = risks`, `strategy = "旧案件未生成完整策略。"`, `decisive_issues = []`, and `probability = null`.

- [ ] **Step 4: Implement the pure copy formatter**

Create `lib/case-copy.ts` with `buildInternalCaseSummary(input)` and helpers `section`, `bullets`, and `numbered`. The formatter must use `normalizeIntakeForDisplay`, `normalizeStoredAnalysis`, and existing label helpers, and must not access browser APIs.

- [ ] **Step 5: Add admin controls and clipboard behavior**

Pass `createdAt={record.createdAt.toISOString()}` from the page. In `CaseDetail`, add:

```tsx
<div className="case-detail-actions">
  <a className="admin-back-link" href="/cases">返回案件列表</a>
  <button className="copy-case-button" onClick={handleCopy} type="button">
    一键复制内部案件摘要
  </button>
</div>
```

Build the text with the formatter. `handleCopy` first calls `navigator.clipboard.writeText`; otherwise it creates a temporary textarea, selects it, calls `document.execCommand("copy")`, removes it, and verifies the boolean result. Set the existing message state to `已复制内部案件摘要。` or `复制失败，请手动选择案件内容。`.

Render new probability, favorable, adverse, decisive, strategy, full steps, materials, and communication sections. Render `尚未评估` for legacy probability.

- [ ] **Step 6: Style and verify admin mobile behavior**

Add flex/wrap styles for `.case-detail-actions`, a visible bordered back link, and a signal-colored copy button. Under `760px`, make both controls full width and keep them above case cards.

- [ ] **Step 7: Run tests and commit**

Run: `npm test -- tests/case-copy.test.ts tests/case-detail.test.tsx tests/admin-pages.test.ts`

Expected: PASS.

```bash
git add lib/schema.ts lib/case-copy.ts tests/case-copy.test.ts components/case-detail.tsx 'app/(admin)/cases/[id]/page.tsx' app/globals.css tests/case-detail.test.tsx
git commit -m "Add mobile admin navigation and case copying"
```

### Task 6: Full verification and live deployment

**Files:**
- No source changes expected

- [ ] **Step 1: Run all automated checks**

Run: `npm test && npm run lint && npm run build`

Expected: all tests PASS, lint has no warnings/errors, and production build succeeds.

- [ ] **Step 2: Review security and compatibility**

Run: `rg -n "communication|strategy|next_steps|contact|operatorNotes" app/api/analyze/route.ts lib/public-analysis.ts`

Expected: the route saves internal fields but responds through `toPublicAnalysis`; the public converter contains only allowlisted output fields and never copies contact or operator notes.

- [ ] **Step 3: Run local visual and interaction QA**

Verify at desktop `1280x720` and mobile `390x844`:

- dual probability ranges are readable
- only the first action contains detailed instructions
- CTA uses signal color and the confirmed copy
- mobile CTA does not cover the disclaimer
- admin detail has a reliable `/cases` return link
- copy action produces structured text and feedback

Do not submit real customer information.

- [ ] **Step 4: Push and monitor Zeabur**

```bash
git status --short --branch
git push origin main
```

Expected: clean `main`, push succeeds, and Zeabur deploys the latest commit.

- [ ] **Step 5: Verify production safely**

Submit one clearly synthetic case, verify the public response excludes internal strategy and communication, log into the protected admin page, verify full internal output and copying, then mark the synthetic record closed. Confirm the Enterprise WeChat notification contains only the existing privacy-safe summary.

- [ ] **Step 6: Report results**

Report the production URL, test count, build status, mobile QA, public/internal boundary verification, and any remaining limitation: probability ranges are estimates based on current information, not measured historical success rates.
