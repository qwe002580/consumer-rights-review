import { describe, expect, it } from "vitest";
import { buildCustomerServiceMessage } from "../lib/customer-service-message";
import type { IntakeInput, PublicAnalysis } from "../lib/schema";

const intake: IntakeInput = {
  clientName: "王女士",
  contact: "wx_refund_001",
  scenario: "medical_beauty",
  amount: 12800,
  purchaseDate: "2026-06-18",
  paymentMethod: "installment",
  stage: "deadlock",
  issues: ["misrepresentation", "refuse_refund"],
  evidence: ["payment", "chat", "contract"],
  obstacles: ["merchant_delay", "missing_evidence"],
  goal: "full_refund",
  summary: "项目未完全做完，商家一直拖延退款。",
  agreementStatus: "签过知情同意书",
  installmentStatus: "仍在扣款",
  platformResult: "平台建议继续协商",
  missingEvidenceType: "缺少宣传承诺截图",
  merchantName: "某某医美",
  merchantPromise: "承诺不满意可退",
  receiveMethod: "wechat",
  wechatId: "wx_refund_001",
  phone: "",
  contactTime: "",
  willingToSupplement: "yes"
};

const result: PublicAnalysis = {
  summary: "付款事实较明确，但仍需核验退款承诺和服务履行情况。",
  opportunity: "medium_high",
  evidenceCompleteness: "partial",
  riskPoints: ["退款承诺需要截图或聊天记录支撑"],
  materialGaps: ["宣传承诺截图", "分期合同"],
  manualReviewRecommended: true,
  review_flag: "contact_soon"
};

describe("customer service message", () => {
  it("formats assessment, contact, intake, and public analysis for customer service", () => {
    const message = buildCustomerServiceMessage({
      assessmentNo: "11399-20260629-0081",
      caseId: "case_123",
      goal: "full_refund",
      intake,
      leadScore: "A",
      result,
      scenario: "medical_beauty"
    });

    expect(message).toContain("【退款自测案情】");
    expect(message).toContain("评估编号：11399-20260629-0081");
    expect(message).toContain("案件编号：case_123");
    expect(message).toContain("客户称呼：王女士");
    expect(message).toContain("联系方式：wx_refund_001");
    expect(message).toContain("纠纷类型：医美纠纷");
    expect(message).toContain("支付金额：¥12,800");
    expect(message).toContain("商家/机构：某某医美");
    expect(message).toContain("- 宣传或承诺不符");
    expect(message).toContain("- 付款记录");
    expect(message).toContain("核心判断：付款事实较明确");
    expect(message).toContain("- 宣传承诺截图");
    expect(message).toContain("请客服根据评估编号调取后台案件");
  });
});
