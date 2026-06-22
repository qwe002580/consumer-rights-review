import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CaseDetail } from "../components/case-detail";

const baseProps = {
  amount: 12800,
  clientName: "王女士",
  contact: "13800000000",
  createdAt: "2026-06-23T08:30:00.000Z",
  id: "case_1",
  intake: {
    clientName: "王女士",
    contact: "13800000000",
    scenario: "education",
    amount: 12800,
    purchaseDate: "2026-06-01",
    paymentMethod: "installment",
    stage: "deadlock",
    issues: ["misrepresentation", "refuse_refund"],
    evidence: ["payment", "chat"],
    obstacles: ["missing_evidence"],
    goal: "full_refund",
    summary: "商家拒绝退款"
  },
  operatorNotes: "",
  scenario: "education",
  status: "new"
};

describe("case detail", () => {
  it("renders back, copy, probability, and complete internal analysis", () => {
    const html = renderToStaticMarkup(
      <CaseDetail
        {...baseProps}
        analysis={{
          summary: "本案涉及教培分期退款争议。",
          favorable_factors: ["付款事实明确"],
          adverse_factors: ["关键承诺仍需补充"],
          decisive_issues: ["能否证明退款承诺"],
          strategy: "先固定承诺与履行差异。",
          next_steps: ["整理材料", "核对合同"],
          public_stage_titles: ["核对材料"],
          materials: ["付款截图"],
          communication: "请贵方书面回复。",
          review_flag: "manual_review",
          probability: {
            full_success: { min: 30, max: 45 },
            substantive_result: { min: 55, max: 70 },
            confidence: "moderate",
            factors: ["付款事实明确"]
          }
        }}
      />
    );

    expect(html).toContain('href="/cases"');
    expect(html).toContain("返回案件列表");
    expect(html).toContain("一键复制内部案件摘要");
    expect(html).toContain("达成全部诉求概率");
    expect(html).toContain("取得实质处理结果概率");
    expect(html).toContain("完整处理策略");
    expect(html).toContain("决定性问题");
  });

  it("keeps legacy case analysis readable without probability data", () => {
    const html = renderToStaticMarkup(
      <CaseDetail
        {...baseProps}
        analysis={{
          summary: "旧案件仍可继续推进。",
          basis: ["付款事实明确"],
          risks: ["聊天承诺仍需补充"],
          next_steps: ["先整理付款和聊天记录"],
          materials: ["付款截图"],
          communication: "请贵方在合理期限内书面回复。",
          review_flag: "manual_review"
        }}
      />
    );

    expect(html).toContain("旧案件仍可继续推进");
    expect(html).toContain("尚未评估");
  });
});
