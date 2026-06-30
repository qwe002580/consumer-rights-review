import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeIntake: vi.fn(),
  calculateLeadScore: vi.fn(),
  createCase: vi.fn(),
  generateAssessmentNumber: vi.fn(),
  sendNewCaseNotification: vi.fn()
}));

vi.mock("@/lib/analysis", () => ({
  analyzeIntake: mocks.analyzeIntake
}));

vi.mock("@/lib/db", () => ({
  prisma: { case: { create: mocks.createCase } }
}));

vi.mock("@/lib/assessment-number", () => ({
  generateAssessmentNumber: mocks.generateAssessmentNumber
}));

vi.mock("@/lib/lead-score", () => ({
  calculateLeadScore: mocks.calculateLeadScore
}));

vi.mock("@/lib/wecom-case-notification", () => ({
  sendNewCaseNotification: mocks.sendNewCaseNotification
}));

import { POST } from "../app/api/analyze/route";

const analysis = {
  summary: "案件具备继续处理基础。",
  opportunity: "medium" as const,
  evidence_completeness: "partial" as const,
  favorable_factors: ["已提交基础交易信息。"],
  adverse_factors: ["仍需核对完整材料。"],
  decisive_issues: ["需要确认承诺内容"],
  materials: ["付款记录"],
  strategy_direction: "INTERNAL_STRATEGY",
  review_flag: "contact_soon" as const
};

const publicAnalysis = {
  summary: analysis.summary,
  opportunity: analysis.opportunity,
  evidenceCompleteness: analysis.evidence_completeness,
  riskPoints: [...analysis.adverse_factors, ...analysis.decisive_issues],
  materialGaps: analysis.materials,
  manualReviewRecommended: true,
  review_flag: analysis.review_flag
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
  summary: "仅用于自动测试",
  merchantName: "测试教育机构",
  merchantPromise: "用户称商家承诺可按条件退费",
  receiveMethod: "page",
  wechatId: "",
  phone: "",
  contactTime: "",
  willingToSupplement: "yes"
};

const createdAt = new Date("2026-06-21T08:00:00.000Z");

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv(
      "PUBLIC_SITE_URL",
      "https://consumer-rights-review.zeabur.app"
    );
    mocks.analyzeIntake.mockResolvedValue(analysis);
    mocks.calculateLeadScore.mockReturnValue({
      points: 9,
      grade: "A",
      reasons: ["争议金额较高 +2"]
    });
    mocks.generateAssessmentNumber.mockReturnValue("11399-20260621-0001");
    mocks.createCase.mockResolvedValue({
      id: "case_123",
      assessmentNo: "11399-20260621-0001",
      scenario: "education",
      amount: 6800,
      receiveMethod: "page",
      leadScore: "A",
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

  it("rejects malformed JSON without analyzing or notifying", async () => {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: "{not-json",
        headers: { "content-type": "application/json" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "INVALID_JSON",
      details: "请求内容格式不正确，请重新提交。"
    });
    expect(mocks.analyzeIntake).not.toHaveBeenCalled();
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
    expect(mocks.createCase.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        assessmentNo: "11399-20260621-0001",
        receiveMethod: "page",
        merchantName: "测试教育机构",
        merchantPromise: "用户称商家承诺可按条件退费",
        wechatId: "",
        phone: "",
        contactTime: "",
        willingToSupplement: "yes",
        leadScore: "A",
        intake: validIntake,
        analysis,
        reviewFlag: "contact_soon",
        status: "uncontacted"
      })
    );
    expect(mocks.sendNewCaseNotification).toHaveBeenCalledWith({
      id: "case_123",
      assessmentNo: "11399-20260621-0001",
      leadScore: "A",
      receiveMethod: "page",
      scenario: "education",
      amount: 6800,
      stage: "deadlock",
      reviewFlag: "contact_soon",
      createdAt,
      siteUrl: "https://consumer-rights-review.zeabur.app"
    });
    await expect(response.json()).resolves.toEqual({
      id: "case_123",
      assessmentNo: "11399-20260621-0001",
      leadScore: "A",
      analysis: publicAnalysis
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
    expect(body.analysis).toEqual(publicAnalysis);
    expect(JSON.stringify(body.analysis)).not.toContain("INTERNAL_STRATEGY");
    expect(body.analysis).not.toHaveProperty("probability");
    expect(body.analysis).not.toHaveProperty("first_step");
  });

  it("retries once when the generated assessment number collides", async () => {
    mocks.generateAssessmentNumber
      .mockReturnValueOnce("11399-20260621-0001")
      .mockReturnValueOnce("11399-20260621-0002");
    mocks.createCase
      .mockRejectedValueOnce({
        code: "P2002",
        meta: { target: ["assessmentNo"] }
      })
      .mockResolvedValueOnce({
        id: "case_456",
        assessmentNo: "11399-20260621-0002",
        scenario: "education",
        amount: 6800,
        receiveMethod: "page",
        leadScore: "A",
        stage: "deadlock",
        reviewFlag: "contact_soon",
        createdAt
      });

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(validIntake),
        headers: { "content-type": "application/json" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.createCase).toHaveBeenCalledTimes(2);
    expect(mocks.createCase.mock.calls[0][0].data.assessmentNo).toBe(
      "11399-20260621-0001"
    );
    expect(mocks.createCase.mock.calls[1][0].data.assessmentNo).toBe(
      "11399-20260621-0002"
    );
    expect(body.assessmentNo).toBe("11399-20260621-0002");
  });

  it("returns 500 without retrying for non-assessment number save errors", async () => {
    mocks.createCase.mockRejectedValueOnce({
      code: "P2002",
      meta: { target: ["contact"] },
      message: "Unique constraint failed on contact"
    });

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(validIntake),
        headers: { "content-type": "application/json" }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "CASE_SAVE_FAILED",
      details: "案件暂时保存失败，请稍后重试。"
    });
    expect(JSON.stringify(body)).not.toContain("Unique constraint");
    expect(mocks.createCase).toHaveBeenCalledOnce();
    expect(mocks.sendNewCaseNotification).not.toHaveBeenCalled();
  });

  it("stops retrying assessment number collisions after five attempts", async () => {
    mocks.createCase.mockRejectedValue({
      code: "P2002",
      meta: { target: ["assessmentNo"] },
      message: "Unique constraint failed on assessmentNo"
    });

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(validIntake),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(500);
    expect(mocks.createCase).toHaveBeenCalledTimes(5);
    expect(mocks.sendNewCaseNotification).not.toHaveBeenCalled();
  });
});
