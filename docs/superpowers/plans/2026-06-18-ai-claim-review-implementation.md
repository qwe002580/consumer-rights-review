# AI Claim Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-oriented first version of the AI consumer dispute review system with a customer intake page, AI analysis API, case list, and case detail workflow.

**Architecture:** Use a single `Next.js` app with App Router. Store intake data, AI output, and operator notes in one database-backed case model; expose one server-side analysis endpoint that validates input, calls the model, persists the case, and returns structured results to the intake UI.

**Tech Stack:** Next.js, TypeScript, React, Prisma with SQLite for first-stage persistence, Zod, OpenAI API

---

## File Structure

- Create: `app/(public)/page.tsx`
- Create: `app/(admin)/cases/page.tsx`
- Create: `app/(admin)/cases/[id]/page.tsx`
- Create: `app/api/analyze/route.ts`
- Create: `app/api/cases/[id]/route.ts`
- Create: `app/globals.css`
- Create: `components/intake-form.tsx`
- Create: `components/analysis-report.tsx`
- Create: `components/case-table.tsx`
- Create: `components/case-detail.tsx`
- Create: `lib/schema.ts`
- Create: `lib/prompt.ts`
- Create: `lib/db.ts`
- Create: `lib/analysis.ts`
- Create: `prisma/schema.prisma`
- Create: `.env.example`
- Create: `tests/schema.test.ts`
- Create: `tests/analysis.test.ts`
- Create: `tests/analyze-route.test.ts`

### Task 1: Scaffold the Next.js app and baseline dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Create the failing dependency check**

```bash
npm run lint
```

Expected: fail because the app has not been scaffolded yet and `package.json` does not exist.

- [ ] **Step 2: Create the Next.js project skeleton**

```json
{
  "name": "ai-claim-review",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "test": "vitest run",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  }
}
```

```tsx
// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Run lint again to verify the scaffold exists**

```bash
npm run lint
```

Expected: fail with missing app pages or config details, not missing project files.

### Task 2: Define the data model and generate the database client

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`
- Test: `prisma/schema.prisma`

- [ ] **Step 1: Write the failing schema test**

```ts
// tests/schema.test.ts
import { describe, expect, it } from "vitest";
import { reviewFlagLabels, caseStatusLabels } from "../lib/schema";

describe("schema labels", () => {
  it("defines all operator-facing review flags", () => {
    expect(Object.keys(reviewFlagLabels)).toEqual([
      "self_service",
      "manual_review",
      "contact_soon",
      "complex_high_risk"
    ]);
  });

  it("defines all operator case statuses", () => {
    expect(Object.keys(caseStatusLabels)).toEqual([
      "new",
      "reviewed",
      "contacted",
      "on_hold",
      "closed"
    ]);
  });
});
```

- [ ] **Step 2: Run the schema test and verify it fails**

```bash
npm test -- tests/schema.test.ts
```

Expected: fail because `lib/schema` does not exist yet.

- [ ] **Step 3: Add the Prisma model and shared enums**

```prisma
model Case {
  id             String   @id @default(cuid())
  clientName     String
  contact        String
  scenario       String
  amount         Int
  purchaseDate   DateTime
  paymentMethod  String
  stage          String
  goal           String
  intake         Json
  analysis       Json?
  reviewFlag     String?
  status         String   @default("new")
  operatorNotes  String   @default("")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

```ts
// lib/schema.ts
export const reviewFlagLabels = {
  self_service: "适合继续自助处理",
  manual_review: "建议人工复核",
  contact_soon: "建议尽快联系",
  complex_high_risk: "高风险复杂案件"
} as const;

export const caseStatusLabels = {
  new: "新提交",
  reviewed: "已复核",
  contacted: "已联系",
  on_hold: "暂缓处理",
  closed: "已关闭"
} as const;
```

- [ ] **Step 4: Re-run the schema test to verify it passes**

```bash
npm test -- tests/schema.test.ts
```

Expected: pass.

- [ ] **Step 5: Generate Prisma client**

```bash
npm run prisma:generate
```

Expected: Prisma client generated successfully.

### Task 3: Validate intake input and analysis output

**Files:**
- Create: `lib/schema.ts`
- Create: `tests/analysis.test.ts`

- [ ] **Step 1: Write the failing analysis parser test**

```ts
// tests/analysis.test.ts
import { describe, expect, it } from "vitest";
import { analysisOutputSchema } from "../lib/schema";

describe("analysis output schema", () => {
  it("accepts the fixed AI response structure", () => {
    const parsed = analysisOutputSchema.parse({
      summary: "从现有信息看，案件具备继续主张基础。",
      basis: ["付款事实明确"],
      risks: ["聊天承诺材料仍需补充"],
      next_steps: ["先整理付款和聊天记录"],
      materials: ["付款记录截图"],
      communication: "请贵方在合理期限内书面回复。",
      review_flag: "manual_review"
    });

    expect(parsed.review_flag).toBe("manual_review");
  });
});
```

- [ ] **Step 2: Run the analysis test and verify it fails**

```bash
npm test -- tests/analysis.test.ts
```

Expected: fail because `analysisOutputSchema` does not exist yet.

- [ ] **Step 3: Implement the Zod schemas**

```ts
// lib/schema.ts
import { z } from "zod";

export const intakeSchema = z.object({
  clientName: z.string().min(1),
  contact: z.string().min(1),
  scenario: z.string().min(1),
  amount: z.number().int().positive(),
  purchaseDate: z.string().min(1),
  paymentMethod: z.string().min(1),
  stage: z.string().min(1),
  issues: z.array(z.string()).min(1),
  evidence: z.array(z.string()).min(1),
  obstacles: z.array(z.string()),
  goal: z.string().min(1),
  summary: z.string().default(""),
  agreementStatus: z.string().optional(),
  installmentStatus: z.string().optional(),
  platformResult: z.string().optional(),
  missingEvidenceType: z.string().optional()
});

export const analysisOutputSchema = z.object({
  summary: z.string().min(1),
  basis: z.array(z.string()).min(1),
  risks: z.array(z.string()).min(1),
  next_steps: z.array(z.string()).min(1),
  materials: z.array(z.string()).min(1),
  communication: z.string().min(1),
  review_flag: z.enum([
    "self_service",
    "manual_review",
    "contact_soon",
    "complex_high_risk"
  ])
});
```

- [ ] **Step 4: Re-run the analysis test to verify it passes**

```bash
npm test -- tests/analysis.test.ts
```

Expected: pass.

### Task 4: Build the prompt generator and analysis service

**Files:**
- Create: `lib/prompt.ts`
- Create: `lib/analysis.ts`
- Modify: `tests/analysis.test.ts`

- [ ] **Step 1: Add a failing service test**

```ts
it("formats intake data into a constrained analysis prompt", async () => {
  const { buildAnalysisPrompt } = await import("../lib/prompt");
  const prompt = buildAnalysisPrompt({
    clientName: "王女士",
    contact: "微信号",
    scenario: "education",
    amount: 12800,
    purchaseDate: "2026-05-28",
    paymentMethod: "installment",
    stage: "deadlock",
    issues: ["misrepresentation"],
    evidence: ["payment", "chat"],
    obstacles: ["missingEvidence"],
    goal: "fullRefund",
    summary: "商家拒绝退款"
  });

  expect(prompt).toContain("不得作出胜诉承诺");
  expect(prompt).toContain("summary");
  expect(prompt).toContain("review_flag");
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
npm test -- tests/analysis.test.ts
```

Expected: fail because `lib/prompt` does not exist yet.

- [ ] **Step 3: Implement the prompt builder and analysis service**

```ts
// lib/prompt.ts
import type { z } from "zod";
import { intakeSchema } from "./schema";

type Intake = z.infer<typeof intakeSchema>;

export function buildAnalysisPrompt(intake: Intake) {
  return `
你是一名克制、专业的消费纠纷预审助手。
不得作出胜诉承诺，不替代正式法律意见。
你只能依据以下用户提交信息进行判断：
${JSON.stringify(intake, null, 2)}

请严格输出 JSON，字段必须包含：
summary, basis, risks, next_steps, materials, communication, review_flag
`;
}
```

- [ ] **Step 4: Re-run the analysis test to verify it passes**

```bash
npm test -- tests/analysis.test.ts
```

Expected: pass.

### Task 5: Implement the analysis API route

**Files:**
- Create: `app/api/analyze/route.ts`
- Create: `tests/analyze-route.test.ts`
- Modify: `lib/analysis.ts`
- Modify: `lib/db.ts`

- [ ] **Step 1: Write the failing route test**

```ts
// tests/analyze-route.test.ts
import { describe, expect, it } from "vitest";

describe("POST /api/analyze", () => {
  it("rejects incomplete intake payloads", async () => {
    const { POST } = await import("../app/api/analyze/route");
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ clientName: "" })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the route test and verify it fails**

```bash
npm test -- tests/analyze-route.test.ts
```

Expected: fail because the route does not exist yet.

- [ ] **Step 3: Implement the route contract**

```ts
// app/api/analyze/route.ts
import { NextResponse } from "next/server";
import { intakeSchema } from "@/lib/schema";
import { analyzeIntake } from "@/lib/analysis";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = intakeSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INTAKE" }, { status: 400 });
  }

  const result = await analyzeIntake(parsed.data);
  return NextResponse.json(result, { status: 200 });
}
```

- [ ] **Step 4: Re-run the route test to verify it passes**

```bash
npm test -- tests/analyze-route.test.ts
```

Expected: pass.

### Task 6: Build the customer intake page and result rendering

**Files:**
- Create: `app/(public)/page.tsx`
- Create: `components/intake-form.tsx`
- Create: `components/analysis-report.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add a failing page smoke test**

```ts
it("renders the intake page title", async () => {
  const page = await import("../app/(public)/page");
  expect(typeof page.default).toBe("function");
});
```

- [ ] **Step 2: Run the relevant test suite and verify it fails**

```bash
npm test -- tests/analysis.test.ts
```

Expected: fail because the page module does not exist yet.

- [ ] **Step 3: Implement the intake page and report components**

```tsx
// app/(public)/page.tsx
import { IntakeForm } from "@/components/intake-form";

export default function PublicPage() {
  return <IntakeForm />;
}
```

```tsx
// components/analysis-report.tsx
type Props = {
  result: {
    summary: string;
    basis: string[];
    risks: string[];
    next_steps: string[];
    materials: string[];
    communication: string;
  } | null;
};

export function AnalysisReport({ result }: Props) {
  if (!result) return <div>填写后可查看初步分析。</div>;
  return <section>{result.summary}</section>;
}
```

- [ ] **Step 4: Run tests again to verify the new modules load**

```bash
npm test -- tests/analysis.test.ts
```

Expected: pass for the smoke assertion and existing analysis tests.

### Task 7: Build the operator case list and detail pages

**Files:**
- Create: `app/(admin)/cases/page.tsx`
- Create: `app/(admin)/cases/[id]/page.tsx`
- Create: `components/case-table.tsx`
- Create: `components/case-detail.tsx`
- Create: `app/api/cases/[id]/route.ts`

- [ ] **Step 1: Add a failing case page test**

```ts
it("exposes a cases list page module", async () => {
  const page = await import("../app/(admin)/cases/page");
  expect(typeof page.default).toBe("function");
});
```

- [ ] **Step 2: Run the test suite and verify it fails**

```bash
npm test -- tests/analysis.test.ts
```

Expected: fail because the cases page does not exist yet.

- [ ] **Step 3: Implement the list/detail pages and update route**

```tsx
// app/(admin)/cases/page.tsx
export default function CasesPage() {
  return <div>案件记录</div>;
}
```

```tsx
// app/(admin)/cases/[id]/page.tsx
export default function CaseDetailPage() {
  return <div>案件详情</div>;
}
```

```ts
// app/api/cases/[id]/route.ts
export async function PATCH() {
  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Re-run the test suite to verify the modules exist**

```bash
npm test -- tests/analysis.test.ts
```

Expected: pass for the new smoke checks.

### Task 8: Verify the whole app workflow

**Files:**
- Test: `app/(public)/page.tsx`
- Test: `app/api/analyze/route.ts`
- Test: `app/(admin)/cases/page.tsx`
- Test: `app/(admin)/cases/[id]/page.tsx`

- [ ] **Step 1: Run the automated checks**

```bash
npm test
```

Expected: all Vitest suites pass.

- [ ] **Step 2: Run the framework checks**

```bash
npm run lint
```

Expected: lint passes with no errors.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: Next.js build succeeds.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: build ai claim review app"
```

