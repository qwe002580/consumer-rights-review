# Enterprise WeChat Case Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a privacy-safe Enterprise WeChat group notification whenever a new case is saved successfully.

**Architecture:** Add one server-only notification module that formats and sends Enterprise WeChat Markdown messages. The analyze route invokes it only after the database write succeeds; notification configuration or delivery failures return a non-throwing status so they never change the customer response.

**Tech Stack:** Next.js 15 route handlers, TypeScript, native `fetch`, Vitest, Zeabur environment variables

---

## File Map

- Create `lib/wecom-case-notification.ts`: format privacy-safe messages and call the robot Webhook.
- Create `tests/wecom-case-notification.test.ts`: verify formatting, privacy boundaries, configuration handling and delivery failures.
- Modify `app/api/analyze/route.ts`: invoke notification after a successful database insert.
- Modify `tests/analyze-route.test.ts`: verify route ordering and failure isolation with mocked dependencies.
- Modify `.env.example`: document optional local notification settings.
- Modify `.env.production.example`: document production notification settings without storing secrets.
- Modify `docs/deploy-zeabur.md`: document Zeabur configuration and safe test procedure.

### Task 1: Build the server-only notification module

**Files:**
- Create: `lib/wecom-case-notification.ts`
- Create: `tests/wecom-case-notification.test.ts`

- [ ] **Step 1: Write tests for message content and privacy**

Create `tests/wecom-case-notification.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildNewCaseNotification,
  sendNewCaseNotification
} from "../lib/wecom-case-notification";

const caseSummary = {
  id: "case_123",
  scenario: "education",
  amount: 6800,
  stage: "deadlock",
  reviewFlag: "contact_soon",
  createdAt: new Date("2026-06-21T08:00:00.000Z"),
  siteUrl: "https://consumer-rights-review.zeabur.app"
};

describe("Enterprise WeChat case notifications", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("builds a concise case notification with a backend link", () => {
    const message = buildNewCaseNotification(caseSummary);

    expect(message).toContain("新退款纠纷案件");
    expect(message).toContain("case_123");
    expect(message).toContain("教培退费");
    expect(message).toContain("¥6,800");
    expect(message).toContain("多轮沟通后仍无进展");
    expect(message).toContain("建议尽快联系");
    expect(message).toContain(
      "https://consumer-rights-review.zeabur.app/cases/case_123"
    );
  });

  it("has no API for passing customer names or contact details", () => {
    const message = buildNewCaseNotification(caseSummary);

    expect(message).not.toContain("客户姓名");
    expect(message).not.toContain("联系方式");
    expect(message).not.toContain("手机号");
    expect(message).not.toContain("微信号");
  });

  it("skips delivery when no webhook is configured", async () => {
    vi.stubEnv("WECOM_CASE_WEBHOOK_URL", "");
    const fetchMock = vi.fn();

    await expect(
      sendNewCaseNotification(caseSummary, fetchMock)
    ).resolves.toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends an Enterprise WeChat markdown payload", async () => {
    vi.stubEnv(
      "WECOM_CASE_WEBHOOK_URL",
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key"
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await expect(
      sendNewCaseNotification(caseSummary, fetchMock)
    ).resolves.toBe("sent");
    expect(fetchMock).toHaveBeenCalledWith(
      process.env.WECOM_CASE_WEBHOOK_URL,
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"msgtype":"markdown"')
      })
    );
  });

  it("returns failed instead of throwing on network errors", async () => {
    vi.stubEnv(
      "WECOM_CASE_WEBHOOK_URL",
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key"
    );
    const fetchMock = vi.fn().mockRejectedValue(new Error("network unavailable"));

    await expect(
      sendNewCaseNotification(caseSummary, fetchMock)
    ).resolves.toBe("failed");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/wecom-case-notification.test.ts`

Expected: FAIL because `lib/wecom-case-notification.ts` does not exist.

- [ ] **Step 3: Implement formatting and delivery**

Create `lib/wecom-case-notification.ts`:

```ts
import {
  getReviewFlagLabel,
  getScenarioLabel,
  getStageLabel
} from "./schema";

export type NewCaseNotification = {
  id: string;
  scenario: string;
  amount: number;
  stage: string;
  reviewFlag?: string | null;
  createdAt: Date;
  siteUrl: string;
};

export type NotificationStatus = "sent" | "skipped" | "failed";
type FetchLike = typeof fetch;

function normalizeSiteUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function buildNewCaseNotification(input: NewCaseNotification) {
  const detailUrl = `${normalizeSiteUrl(input.siteUrl)}/cases/${encodeURIComponent(input.id)}`;
  const amount = new Intl.NumberFormat("zh-CN").format(input.amount);
  const submittedAt = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai"
  }).format(input.createdAt);

  return [
    "## 新退款纠纷案件",
    `> 案件编号：${input.id}`,
    `> 纠纷类型：${getScenarioLabel(input.scenario)}`,
    `> 支付金额：¥${amount}`,
    `> 当前进度：${getStageLabel(input.stage)}`,
    `> 处理优先级：${getReviewFlagLabel(input.reviewFlag)}`,
    `> 提交时间：${submittedAt}`,
    `[进入案件后台查看详情](${detailUrl})`
  ].join("\n");
}

export async function sendNewCaseNotification(
  input: NewCaseNotification,
  fetchImpl: FetchLike = fetch
): Promise<NotificationStatus> {
  const webhookUrl = process.env.WECOM_CASE_WEBHOOK_URL?.trim();
  if (!webhookUrl) return "skipped";

  try {
    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: { content: buildNewCaseNotification(input) }
      }),
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return "failed";

    const result = (await response.json()) as { errcode?: number };
    return result.errcode === 0 ? "sent" : "failed";
  } catch {
    console.error("Enterprise WeChat case notification failed");
    return "failed";
  }
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- tests/wecom-case-notification.test.ts`

Expected: 5 tests PASS, with no Webhook value printed.

- [ ] **Step 5: Commit the notification module**

```bash
git add lib/wecom-case-notification.ts tests/wecom-case-notification.test.ts
git commit -m "Add privacy-safe WeCom case notifications"
```

### Task 2: Trigger notification after a successful case save

**Files:**
- Modify: `app/api/analyze/route.ts`
- Modify: `tests/analyze-route.test.ts`

- [ ] **Step 1: Extend the route test with mocked dependencies**

Replace `tests/analyze-route.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeIntake: vi.fn(),
  createCase: vi.fn(),
  sendNewCaseNotification: vi.fn()
}));

vi.mock("@/lib/analysis", () => ({
  analyzeIntake: mocks.analyzeIntake
}));

vi.mock("@/lib/db", () => ({
  prisma: { case: { create: mocks.createCase } }
}));

vi.mock("@/lib/wecom-case-notification", () => ({
  sendNewCaseNotification: mocks.sendNewCaseNotification
}));

import { POST } from "../app/api/analyze/route";

const analysis = {
  summary: "案件具备继续处理基础。",
  basis: ["已提交基础交易信息。"],
  risks: ["仍需核对完整材料。"],
  next_steps: ["整理付款和沟通记录。"],
  materials: ["付款记录"],
  communication: "请商家书面回复处理意见。",
  review_flag: "contact_soon" as const
};

const validIntake = {
  clientName: "测试客户",
  contact: "test-contact",
  scenario: "education",
  amount: 6800,
  purchaseDate: "2026-06-01",
  paymentMethod: "full",
  stage: "deadlock",
  issues: ["refuse_refund"],
  evidence: ["payment"],
  obstacles: ["merchant_delay"],
  goal: "full_refund",
  summary: "仅用于自动测试"
};

const createdAt = new Date("2026-06-21T08:00:00.000Z");

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv(
      "PUBLIC_SITE_URL",
      "https://consumer-rights-review.zeabur.app"
    );
    mocks.analyzeIntake.mockResolvedValue(analysis);
    mocks.createCase.mockResolvedValue({
      id: "case_123",
      scenario: "education",
      amount: 6800,
      stage: "deadlock",
      reviewFlag: "contact_soon",
      createdAt
    });
    mocks.sendNewCaseNotification.mockResolvedValue("sent");
  });

  it("rejects incomplete intake payloads without notifying", async () => {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify({ clientName: "" }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.sendNewCaseNotification).not.toHaveBeenCalled();
  });

  it("notifies after saving a valid case", async () => {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(validIntake),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.createCase).toHaveBeenCalledOnce();
    expect(mocks.sendNewCaseNotification).toHaveBeenCalledWith({
      id: "case_123",
      scenario: "education",
      amount: 6800,
      stage: "deadlock",
      reviewFlag: "contact_soon",
      createdAt,
      siteUrl: "https://consumer-rights-review.zeabur.app"
    });
  });

  it("still returns the analysis when notification delivery fails", async () => {
    mocks.sendNewCaseNotification.mockResolvedValue("failed");

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(validIntake),
        headers: { "content-type": "application/json" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysis).toEqual(analysis);
  });
});
```

- [ ] **Step 2: Run the route test and verify the new assertions fail**

Run: `npm test -- tests/analyze-route.test.ts`

Expected: FAIL because the route does not call `sendNewCaseNotification`.

- [ ] **Step 3: Invoke notification after database persistence**

Modify `app/api/analyze/route.ts` to import the sender and call it after `prisma.case.create`:

```ts
import { sendNewCaseNotification } from "@/lib/wecom-case-notification";

const siteUrl =
  process.env.PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;

await sendNewCaseNotification({
  id: record.id,
  scenario: record.scenario,
  amount: record.amount,
  stage: record.stage,
  reviewFlag: record.reviewFlag,
  createdAt: record.createdAt,
  siteUrl
});
```

Keep this call after the database insert and before the existing `NextResponse.json` success response. Do not pass `record.clientName`, `record.contact`, `record.intake` or `record.analysis`.

- [ ] **Step 4: Run route and notification tests**

Run: `npm test -- tests/analyze-route.test.ts tests/wecom-case-notification.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 5: Commit route integration**

```bash
git add app/api/analyze/route.ts tests/analyze-route.test.ts
git commit -m "Notify operators when cases are submitted"
```

### Task 3: Document deployment configuration

**Files:**
- Modify: `.env.example`
- Modify: `.env.production.example`
- Modify: `docs/deploy-zeabur.md`

- [ ] **Step 1: Add safe environment variable examples**

Append to `.env.example`:

```dotenv
WECOM_CASE_WEBHOOK_URL=""
PUBLIC_SITE_URL="http://localhost:3000"
```

Append to `.env.production.example`:

```dotenv
WECOM_CASE_WEBHOOK_URL="请填写企业微信群机器人 Webhook，不要提交真实值"
PUBLIC_SITE_URL="https://consumer-rights-review.zeabur.app"
```

- [ ] **Step 2: Add Zeabur configuration instructions**

Add a section to `docs/deploy-zeabur.md` that tells the operator to create `WECOM_CASE_WEBHOOK_URL` and `PUBLIC_SITE_URL` in Zeabur service variables, redeploy, submit one synthetic case, verify one group notification, and delete the synthetic case if it appears in the case list. State explicitly that the Webhook must never be committed or pasted into public pages.

- [ ] **Step 3: Check the repository for accidental secrets**

Run: `git grep -n "qyapi.weixin.qq.com/cgi-bin/webhook/send?key=" -- ':!docs/superpowers/plans/2026-06-21-wecom-case-notification.md'`

Expected: only test fixtures containing `test-key`; no real Webhook key.

- [ ] **Step 4: Commit configuration documentation**

```bash
git add .env.example .env.production.example docs/deploy-zeabur.md
git commit -m "Document WeCom notification configuration"
```

### Task 4: Verify, deploy and test the live notification

**Files:**
- No source changes expected

- [ ] **Step 1: Run all automated checks**

Run: `npm test && npm run lint && npm run build`

Expected: all tests PASS, lint reports no warnings or errors, and the production build completes.

- [ ] **Step 2: Confirm Git state and push**

Run: `git status --short --branch`

Expected: clean worktree on `main`, ahead of `origin/main` only by the notification commits.

Run: `git push origin main`

Expected: push succeeds and Zeabur starts a new deployment.

- [ ] **Step 3: Configure Zeabur variables**

Set `WECOM_CASE_WEBHOOK_URL` to the Webhook supplied out-of-band and set `PUBLIC_SITE_URL` to `https://consumer-rights-review.zeabur.app`. Never place the Webhook value in terminal output, source files, screenshots or commit messages.

- [ ] **Step 4: Wait for the deployment and verify the website**

Open `https://consumer-rights-review.zeabur.app/` and verify the refund self-check loads. Open `/cases` while logged out and verify it redirects to `/admin/login`.

- [ ] **Step 5: Send one privacy-safe test notification**

Call the configured Enterprise WeChat Webhook with a synthetic Markdown message containing no customer data and a clearly marked test case ID such as `TEST-NOTIFICATION`. Verify that the group receives exactly one message and that its backend link points to the production domain.

- [ ] **Step 6: Final secret scan**

Run: `git grep -n "qyapi.weixin.qq.com/cgi-bin/webhook/send?key="`

Expected: matches use only the literal `test-key` test fixture and documentation examples; no production Webhook value appears.

- [ ] **Step 7: Report completion**

Report the production URL, automated-check results, notification receipt, and confirm that the Webhook is stored only in Zeabur environment variables.
