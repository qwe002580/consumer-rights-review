import { describe, expect, it } from "vitest";
import { caseStatusLabels, intakeSchema, reviewFlagLabels, scenarioLabels } from "../lib/schema";

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

  it("requires the other party contact information", () => {
    const parsed = intakeSchema.safeParse({
      clientName: "王女士",
      contact: "",
      scenario: "education",
      amount: 5000,
      purchaseDate: "2026-06-01",
      paymentMethod: "full",
      stage: "negotiating",
      issues: ["refuse_refund"],
      evidence: ["payment"],
      obstacles: [],
      goal: "full_refund",
      summary: ""
    });

    expect(parsed.success).toBe(false);
  });

  it("defines a more complete set of dispute scenarios", () => {
    expect(Object.keys(scenarioLabels).length).toBeGreaterThanOrEqual(15);
    expect(scenarioLabels).toMatchObject({
      education: "教培退费",
      medical_beauty: "医美纠纷",
      ecommerce: "电商售后",
      live_stream: "直播间消费",
      gaming: "游戏充值",
      food_delivery: "外卖餐饮",
      logistics: "快递物流",
      home_services: "家政/维修服务",
      rental: "租房/公寓纠纷",
      fitness: "健身/摄影/婚庆服务"
    });
  });
});
