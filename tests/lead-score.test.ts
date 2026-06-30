import { describe, expect, it } from "vitest";
import { calculateLeadScore } from "../lib/lead-score";
import type { IntakeInput } from "../lib/schema";

const now = new Date("2026-06-29T04:00:00Z");

function intake(overrides: Partial<IntakeInput> = {}): IntakeInput {
  return {
    clientName: "王女士",
    contact: "",
    scenario: "education",
    amount: 500,
    purchaseDate: "2020-01-01",
    paymentMethod: "full",
    stage: "none",
    issues: ["quality"],
    evidence: ["promo"],
    obstacles: [],
    goal: "compensation",
    summary: "这是一个足够详细的案件情况说明，用于描述争议事实和当前处理进展。",
    merchantName: "某培训机构",
    merchantPromise: "不清楚",
    receiveMethod: "page",
    wechatId: "",
    phone: "",
    contactTime: "",
    willingToSupplement: "unknown",
    ...overrides
  };
}

function purchaseDatePoints(purchaseDate: string, current: Date) {
  const result = calculateLeadScore(
    intake({ purchaseDate, receiveMethod: "wechat", wechatId: "wx-wang" }),
    current
  );
  return result.points - 1;
}

describe("calculateLeadScore", () => {
  it("assigns grade A at exactly 8 points", () => {
    const result = calculateLeadScore(
      intake({
        amount: 3000,
        purchaseDate: "2024-06-29",
        evidence: ["payment", "chat"],
        goal: "full_refund",
        merchantName: "",
        receiveMethod: "page"
      }),
      now
    );

    expect(result).toMatchObject({ points: 8, grade: "A" });
  });

  it("assigns grade B at exactly 4 points", () => {
    const result = calculateLeadScore(
      intake({ amount: 1000, evidence: ["payment"], receiveMethod: "wechat" }),
      now
    );

    expect(result).toMatchObject({ points: 4, grade: "B" });
  });

  it("assigns grade C below 4 points", () => {
    const result = calculateLeadScore(intake(), now);

    expect(result).toMatchObject({ points: -1, grade: "C" });
  });

  it("uses the Asia/Shanghai date at midnight", () => {
    expect(purchaseDatePoints("2026-06-30", new Date("2026-06-29T15:59:59Z"))).toBe(0);
    expect(purchaseDatePoints("2026-06-30", new Date("2026-06-29T16:00:00Z"))).toBe(2);
  });

  it("gives no age points to future or malformed purchase dates", () => {
    expect(purchaseDatePoints("2026-06-30", now)).toBe(0);
    expect(purchaseDatePoints("2026-02-30", now)).toBe(0);
    expect(purchaseDatePoints("2026-06-01-extra", now)).toBe(0);
  });

  it("scores exact two-year and three-year calendar boundaries", () => {
    expect(purchaseDatePoints("2024-06-29", now)).toBe(2);
    expect(purchaseDatePoints("2024-06-28", now)).toBe(1);
    expect(purchaseDatePoints("2023-06-29", now)).toBe(1);
    expect(purchaseDatePoints("2023-06-28", now)).toBe(0);
  });

  it("clamps leap-day anniversaries to the last day of February", () => {
    const twoYearBoundary = new Date("2026-02-28T04:00:00Z");
    const afterTwoYears = new Date("2026-03-01T04:00:00Z");
    const threeYearBoundary = new Date("2027-02-28T04:00:00Z");
    const afterThreeYears = new Date("2027-03-01T04:00:00Z");

    expect(purchaseDatePoints("2024-02-29", twoYearBoundary)).toBe(2);
    expect(purchaseDatePoints("2024-02-29", afterTwoYears)).toBe(1);
    expect(purchaseDatePoints("2024-02-29", threeYearBoundary)).toBe(1);
    expect(purchaseDatePoints("2024-02-29", afterThreeYears)).toBe(0);
  });

  it("penalizes page-only delivery even when legacy contact is populated", () => {
    const result = calculateLeadScore(intake({ contact: "fake-contact" }), now);

    expect(result.points).toBe(-1);
    expect(result.reasons).toContain("仅选择页面接收 -1");
  });

  it("deducts one point for a thin summary with fewer than two evidence items", () => {
    const result = calculateLeadScore(
      intake({ receiveMethod: "wechat", summary: "  信息很少  ", evidence: ["payment"] }),
      now
    );

    expect(result.points).toBe(2);
    expect(result.reasons).toContain("案情描述和材料较少 -1");
  });

  it("returns stable reasons for all positive scoring factors", () => {
    const result = calculateLeadScore(
      intake({
        amount: 3000,
        purchaseDate: "2025-01-01",
        evidence: ["payment", "contract"],
        issues: ["refuse_refund"],
        obstacles: ["merchant_delay"],
        goal: "terminate_service",
        merchantPromise: "承诺随时退款",
        receiveMethod: "phone",
        phone: "13800138000",
        contactTime: "now",
        willingToSupplement: "yes"
      }),
      now
    );

    expect(result).toEqual({
      points: 14,
      grade: "A",
      reasons: [
        "争议金额较高 +2",
        "购买时间在两年内 +2",
        "有付款凭证 +2",
        "有关键辅助材料 +2",
        "存在明显履约或退款障碍 +2",
        "愿意接受联系 +1",
        "愿意补充材料 +1",
        "诉求明确 +1",
        "商家信息较完整 +1"
      ]
    });
  });
});
