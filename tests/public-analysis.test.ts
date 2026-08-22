import { describe, expect, it } from "vitest";
import { toPublicAnalysis } from "../lib/public-analysis";
import type { AnalysisOutput } from "../lib/schema";

const internalAnalysis: AnalysisOutput = {
  summary: "本案需要围绕付款与承诺差异进一步核对。",
  opportunity: "medium_high",
  evidence_completeness: "partial",
  favorable_factors: ["付款事实明确", "沟通记录已保存"],
  adverse_factors: ["风险1", "风险2", "风险3"],
  decisive_issues: ["风险4", "风险5"],
  materials: ["材料1", "材料2", "材料3", "材料4", "材料5"],
  strategy_direction: "INTERNAL_STRATEGY",
  review_flag: "contact_soon"
};

describe("public analysis boundary", () => {
  it("returns the exact diagnosis-only whitelist with bounded lists", () => {
    const result = toPublicAnalysis(internalAnalysis);
    const serialized = JSON.stringify(result);

    expect(result).toEqual({
      summary: internalAnalysis.summary,
      opportunity: "medium_high",
      evidenceCompleteness: "partial",
      riskPoints: ["风险1", "风险2", "风险3", "风险4"],
      materialGaps: ["材料1", "材料2", "材料3", "材料4"],
      manualReviewRecommended: true,
      review_flag: "contact_soon"
    });
    expect(Object.keys(result).sort()).toEqual([
      "evidenceCompleteness",
      "manualReviewRecommended",
      "materialGaps",
      "opportunity",
      "review_flag",
      "riskPoints",
      "summary"
    ].sort());
    for (const prohibited of [
      "probability", "first_step", "stages", "strategy", "steps",
      "communication", "favorable_factors"
    ]) {
      expect(result).not.toHaveProperty(prohibited);
    }
    expect(serialized).not.toContain("INTERNAL_STRATEGY");
  });

  it("replaces unsafe prose inside allowlisted fields with diagnostic fallbacks", () => {
    const result = toPublicAnalysis({
      ...internalAnalysis,
      summary: "成功率95%，保证全额退款。",
      adverse_factors: ["第一步拨打12315并复制以下投诉模板", "合同条款仍需核验"],
      decisive_issues: ["起诉状模板如下：原告应当……"],
      materials: ["点击平台入口后按步骤提交", "付款记录"]
    });
    const serialized = JSON.stringify(result);

    expect(result.summary).toBe("当前信息需要进一步核验后形成诊断结论。");
    expect(result.riskPoints).toEqual([
      "该风险点包含非诊断内容，需要人工复核。",
      "合同条款仍需核验",
      "该风险点包含非诊断内容，需要人工复核。"
    ]);
    expect(result.materialGaps).toEqual([
      "该材料项包含非诊断内容，需要人工复核。",
      "付款记录"
    ]);
    expect(serialized).not.toMatch(/95%|保证|12315|投诉模板|起诉状模板|平台入口/);
  });

  it("recommends manual review when unsafe model prose is removed", () => {
    const result = toPublicAnalysis({
      ...internalAnalysis,
      summary: "保证退款成功",
      review_flag: "self_service"
    });

    expect(result.manualReviewRecommended).toBe(true);
  });

  it("routes low amount one-time payment cases to self-service communication and 12345 guidance", () => {
    const result = toPublicAnalysis(
      {
        ...internalAnalysis,
        opportunity: "medium_high",
        evidence_completeness: "partial",
        review_flag: "contact_soon"
      },
      {
        amount: 2999,
        paymentMethod: "full"
      }
    );

    expect(result).toEqual({
      summary: "根据你填写的信息，本次争议金额相对较低，且属于一次性付款情形，建议先保留付款凭证、沟通记录和商家承诺内容，优先与机构继续沟通；如沟通无进展，可考虑通过 12345 等公共投诉渠道反映处理。",
      opportunity: "low",
      evidenceCompleteness: "partial",
      riskPoints: [
        "金额较低时，投入过多人工处理成本可能不划算，建议先用协商和公共投诉渠道推动。",
        "目前更适合先整理付款凭证、聊天记录、合同或宣传承诺截图，再向机构提出明确退款诉求。"
      ],
      materialGaps: ["付款凭证", "与机构沟通记录", "合同或服务协议", "宣传承诺截图"],
      manualReviewRecommended: false,
      review_flag: "self_service"
    });
  });

  it("does not self-service route low amount installment cases", () => {
    const result = toPublicAnalysis(
      {
        ...internalAnalysis,
        review_flag: "contact_soon"
      },
      {
        amount: 2999,
        paymentMethod: "installment"
      }
    );

    expect(result.review_flag).toBe("contact_soon");
    expect(result.manualReviewRecommended).toBe(true);
  });

  it.each([
    "平台投诉已被驳回",
    "商家退款流程尚未完成",
    "商家承诺退款但尚未履行",
    "商家承诺全额退款但尚未履行",
    "培训机构保证可以退费却一直没有兑现",
    "保证条款的适用范围仍需核验",
    "点击记录可用于核对页面内容",
    "诉讼材料是否齐全仍待人工判断"
  ])("preserves legitimate diagnostic wording: %s", (diagnostic) => {
    const result = toPublicAnalysis({
      ...internalAnalysis,
      adverse_factors: [diagnostic],
      decisive_issues: [],
      review_flag: "self_service"
    });

    expect(result.riskPoints).toEqual([diagnostic]);
  });

  it.each([
    "照下面模板投诉",
    "第一步点击平台入口",
    "胜诉率九成",
    "百分百退款",
    "保证一定退款",
    "保证一定退费",
    "胜诉概率九成",
    "退款概率八成",
    "胜 诉 概 率 九 成",
    "保 证 一 定 退 费",
    "商家承诺全额退款但尚未履行，第一步点击平台入口",
    "照 下 面 模 板 投 诉",
    "第 一 步 点 击 平 台 入 口",
    "胜 诉 率 九 成",
    "百 分 百 退 款",
    "保 证 一 定 退 款"
  ])("blocks procedural, promissory, and spaced evasion wording: %s", (unsafe) => {
    const result = toPublicAnalysis({
      ...internalAnalysis,
      adverse_factors: [unsafe],
      decisive_issues: [],
      review_flag: "self_service"
    });

    expect(result.riskPoints).toEqual([
      "该风险点包含非诊断内容，需要人工复核。"
    ]);
    expect(result.manualReviewRecommended).toBe(true);
  });

  it.each([
    "商家承诺全额退款但尚未履行；我们保证一定退费",
    "商家承诺全额退款但尚未履行，我们保证一定退费",
    "商家承诺全额退款但尚未履行。我们保证一定退费",
    "商家承诺全额退款但尚未履行!我们保证一定退费",
    "商家承诺全额退款但尚未履行\n我们保证一定退费",
    "商家承诺全额退款但尚未履行；保证一定，退费",
    "商家承诺全额退款但尚未履行。保证一定。退费",
    "商家承诺全额退款但尚未履行\n保证一定\n退费"
  ])("limits merchant-attribution exemptions to one clause: %s", (unsafe) => {
    const result = toPublicAnalysis({
      ...internalAnalysis,
      adverse_factors: [unsafe],
      decisive_issues: [],
      review_flag: "self_service"
    });

    expect(result.riskPoints).toEqual([
      "该风险点包含非诊断内容，需要人工复核。"
    ]);
    expect(result.manualReviewRecommended).toBe(true);
  });
});
