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
  merchantName: "测试商家",
  merchantPromise: "承诺服务内容与宣传一致",
  receiveMethod: "page",
  wechatId: "",
  phone: "",
  contactTime: "",
  willingToSupplement: "yes",
  ...overrides
} as IntakeInput);

describe("probability assessment", () => {
  it("is legacy/internal-only and absent from the public schema", async () => {
    const { publicAnalysisSchema } = await import("../lib/schema");
    expect(publicAnalysisSchema.keyof().options).not.toContain("probability");
  });

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
    expect(first.full_success.min).toBeLessThanOrEqual(first.substantive_result.min);
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
