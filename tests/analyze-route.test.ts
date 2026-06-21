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
