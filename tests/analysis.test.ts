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
    expect(prompt).toContain("教培退费");
    expect(prompt).not.toContain('"scenario": "education"');
    expect(prompt).toContain("语气应当冷静、克制、像专业顾问");
    expect(prompt).toContain("不要使用“稳赢”");
  });

  it("exposes the intake form component module", async () => {
    const mod = await import("../components/intake-form");
    expect(typeof mod.IntakeForm).toBe("function");
  });

  it("returns a professional fallback analysis tone when no api key is configured", async () => {
    const originalKey = process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;

    const { analyzeIntake } = await import("../lib/analysis");
    const result = await analyzeIntake({
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

    expect(result.summary).toContain("从现有信息看");
    expect(result.summary).not.toContain("education");
    expect(result.communication).toContain("请贵方");

    process.env.DEEPSEEK_API_KEY = originalKey;
  });

  it("upgrades review flags for complex cases even if the model is conservative", async () => {
    const { applyReviewFlagPolicy } = await import("../lib/analysis");

    const upgraded = applyReviewFlagPolicy(
      {
        clientName: "王女士",
        contact: "微信号",
        scenario: "education",
        amount: 12800,
        purchaseDate: "2025-05-28",
        paymentMethod: "installment",
        stage: "deadlock",
        issues: ["misrepresentation"],
        evidence: ["payment", "chat"],
        obstacles: ["missingEvidence", "platformRejected"],
        goal: "fullRefund",
        summary: "商家拒绝退款"
      },
      {
        summary: "从现有信息看，案件仍可推进。",
        basis: ["付款事实明确"],
        risks: ["关键材料不完整"],
        next_steps: ["先补材料"],
        materials: ["补聊天记录"],
        communication: "请贵方尽快回复。",
        review_flag: "self_service"
      }
    );

    expect(upgraded.review_flag).toBe("complex_high_risk");
  });

  it("preserves stronger model flags when already escalated", async () => {
    const { applyReviewFlagPolicy } = await import("../lib/analysis");

    const result = applyReviewFlagPolicy(
      {
        clientName: "王女士",
        contact: "微信号",
        scenario: "education",
        amount: 3000,
        purchaseDate: "2025-05-28",
        paymentMethod: "full",
        stage: "negotiating",
        issues: ["misrepresentation"],
        evidence: ["payment", "chat"],
        obstacles: [],
        goal: "fullRefund",
        summary: "商家拒绝退款"
      },
      {
        summary: "从现有信息看，案件仍可推进。",
        basis: ["付款事实明确"],
        risks: ["存在较大处理不确定性"],
        next_steps: ["先补材料"],
        materials: ["补聊天记录"],
        communication: "请贵方尽快回复。",
        review_flag: "contact_soon"
      }
    );

    expect(result.review_flag).toBe("contact_soon");
  });
});
