import { describe, expect, it } from "vitest";
import { buildInternalCaseSummary } from "../lib/case-copy";

const analysis = {
  summary: "本案涉及12,800元教培分期，争议集中在退款承诺。",
  favorable_factors: ["付款事实明确"],
  adverse_factors: ["宣传承诺截图仍需补充"],
  decisive_issues: ["能否证明明确退款承诺"],
  strategy: "先固定承诺与履行差异，再确定处理顺序。",
  next_steps: ["整理付款和聊天记录", "核对合同条款", "形成沟通方案"],
  public_stage_titles: ["核对材料", "评估路径"],
  materials: ["宣传页面截图"],
  communication: "请贵方书面说明退款依据。",
  review_flag: "contact_soon",
  probability: {
    full_success: { min: 30, max: 45 },
    substantive_result: { min: 55, max: 70 },
    confidence: "moderate",
    factors: ["付款事实明确", "涉及分期安排"]
  }
};

const input = {
  id: "case_123",
  assessmentNo: "11399-20260623-0001",
  addedWechat: true,
  addedWechatAt: "2026-06-23T09:00:00.000Z",
  createdAt: "2026-06-23T08:30:00.000Z",
  status: "strong_interest",
  clientName: "王女士",
  contact: "wx123456",
  contactTime: "",
  leadScore: "A",
  merchantName: "某培训机构",
  merchantPromise: "承诺可按课时退费",
  phone: "",
  receiveMethod: "wechat",
  scenario: "education",
  amount: 12800,
  operatorNotes: "明日上午联系",
  intake: {
    clientName: "王女士",
    contact: "wx123456",
    scenario: "education",
    amount: 12800,
    purchaseDate: "2026-06-01",
    paymentMethod: "installment",
    stage: "deadlock",
    issues: ["misrepresentation", "refuse_refund"],
    evidence: ["payment", "chat"],
    obstacles: ["missing_evidence"],
    goal: "full_refund",
    summary: "商家拒绝退款",
    merchantName: "某培训机构",
    merchantPromise: "承诺可按课时退费",
    receiveMethod: "wechat",
    wechatId: "wx123456",
    phone: "",
    contactTime: "",
    willingToSupplement: "yes"
  },
  wechatId: "wx123456",
  willingToSupplement: "yes",
  analysis
};

describe("internal case summary", () => {
  it("formats all case and analysis sections for internal use", () => {
    const text = buildInternalCaseSummary(input);

    expect(text).toContain("【内部案件摘要】");
    expect(text).toContain("案件编号：case_123");
    expect(text).toContain("评估编号：11399-20260623-0001");
    expect(text).toContain("线索等级：A");
    expect(text).toContain("评分依据：争议金额较高 +2");
    expect(text).toContain("购买时间在两年内 +2");
    expect(text).toContain("企微添加：已点击添加");
    expect(text).toContain("企微点击时间：");
    expect(text).toContain("状态：强意向");
    expect(text).toContain("优先级：建议尽快联系");
    expect(text).toContain("客户称呼：王女士");
    expect(text).toContain("接收方式：微信");
    expect(text).toContain("微信号：wx123456");
    expect(text).toContain("商家/机构：某培训机构");
    expect(text).toContain("商家承诺：承诺可按课时退费");
    expect(text).toContain("支付金额：¥12,800");
    expect(text).toContain("达成全部诉求概率：30%–45%");
    expect(text).toContain("取得实质处理结果概率：55%–70%");
    expect(text).toContain("付款事实明确");
    expect(text).toContain("先固定承诺与履行差异");
    expect(text).toContain("1. 整理付款和聊天记录");
    expect(text).toContain("请贵方书面说明退款依据");
    expect(text).toContain("后台备注：明日上午联系");

    const headings = [
      "一、案件概览",
      "二、客户与交易",
      "三、客户提交情况",
      "四、概率评估",
      "五、完整分析",
      "六、处理步骤与材料",
      "七、沟通与备注"
    ];
    headings.forEach((heading, index) => {
      if (index > 0) {
        expect(text.indexOf(heading)).toBeGreaterThan(text.indexOf(headings[index - 1]));
      }
    });
  });

  it("calculates score reasons at submission time instead of the current date", () => {
    const text = buildInternalCaseSummary({
      ...input,
      createdAt: "2028-06-23T08:30:00.000Z",
      intake: { ...input.intake, purchaseDate: "2026-06-01" }
    });

    expect(text).toContain("购买时间在三年内 +1");
    expect(text).not.toContain("购买时间在两年内 +2");
  });
});
