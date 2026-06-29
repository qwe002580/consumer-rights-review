import { describe, expect, it } from "vitest";
import { caseStatusLabels, intakeSchema, reviewFlagLabels, scenarioLabels } from "../lib/schema";

const validIntake = {
  clientName: "王女士",
  contact: "wx-wang",
  scenario: "education",
  amount: 5000,
  purchaseDate: "2026-06-01",
  paymentMethod: "full",
  stage: "negotiating",
  issues: ["refuse_refund"],
  evidence: ["payment"],
  obstacles: [],
  goal: "full_refund",
  summary: "",
  merchantName: "某培训机构",
  merchantPromise: "不清楚",
  receiveMethod: "wechat" as const,
  wechatId: "wx-wang",
  phone: "",
  contactTime: "",
  willingToSupplement: "unknown" as const
};

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

  it("allows page-only delivery without contact details", () => {
    const parsed = intakeSchema.safeParse({
      ...validIntake,
      contact: "",
      receiveMethod: "page",
      wechatId: ""
    });

    expect(parsed.success).toBe(true);
  });

  it("requires a real non-future YYYY-MM-DD purchase date", () => {
    for (const purchaseDate of [
      "2026-02-30",
      "2025-02-29",
      "2026-6-01",
      "2026-06-01-extra",
      "2999-01-01"
    ]) {
      expect(intakeSchema.safeParse({ ...validIntake, purchaseDate }).success).toBe(false);
    }
    expect(intakeSchema.safeParse({ ...validIntake, purchaseDate: "2024-02-29" }).success).toBe(true);
  });

  it("requires a nonblank WeChat ID for WeChat delivery", () => {
    expect(intakeSchema.safeParse({ ...validIntake, wechatId: "  " }).success).toBe(false);
  });

  it("requires a mainland mobile number for SMS delivery", () => {
    expect(
      intakeSchema.safeParse({ ...validIntake, receiveMethod: "sms", phone: "12345" }).success
    ).toBe(false);
    expect(
      intakeSchema.safeParse({ ...validIntake, receiveMethod: "sms", phone: "13800138000" }).success
    ).toBe(true);
    const trimmed = intakeSchema.safeParse({
      ...validIntake,
      receiveMethod: "sms",
      phone: " 13800138000 "
    });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.phone).toBe("13800138000");
  });

  it("ignores stale contact fields that do not belong to the receive method", () => {
    expect(
      intakeSchema.safeParse({
        ...validIntake,
        contact: "legacy-contact",
        receiveMethod: "page",
        wechatId: "stale-wechat",
        phone: "not-a-mobile",
        contactTime: "tomorrow"
      }).success
    ).toBe(true);
  });

  it("requires a mobile number and valid contact time for phone delivery", () => {
    expect(
      intakeSchema.safeParse({
        ...validIntake,
        receiveMethod: "phone",
        phone: "13800138000",
        contactTime: ""
      }).success
    ).toBe(false);
    for (const contactTime of ["now", "30m", "afternoon", "evening", "tomorrow"]) {
      expect(
        intakeSchema.safeParse({
          ...validIntake,
          receiveMethod: "phone",
          phone: "13800138000",
          contactTime
        }).success
      ).toBe(true);
    }
  });

  it("allows an empty contact time for non-phone delivery", () => {
    for (const receiveMethod of ["wechat", "sms", "page"] as const) {
      expect(
        intakeSchema.safeParse({
          ...validIntake,
          receiveMethod,
          phone: receiveMethod === "sms" ? "13800138000" : "",
          contactTime: ""
        }).success
      ).toBe(true);
    }
  });

  it("rejects contact times outside the allowed values", () => {
    expect(
      intakeSchema.safeParse({ ...validIntake, contactTime: "weekend" }).success
    ).toBe(false);
  });

  it("requires merchant facts but accepts an unclear promise", () => {
    expect(intakeSchema.safeParse({ ...validIntake, merchantName: "  " }).success).toBe(false);
    expect(intakeSchema.safeParse({ ...validIntake, merchantPromise: "  " }).success).toBe(false);
    expect(intakeSchema.safeParse(validIntake).success).toBe(true);
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
