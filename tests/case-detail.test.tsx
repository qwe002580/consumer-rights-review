import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CaseDetail } from "../components/case-detail";

describe("case detail", () => {
  it("renders structured case cards instead of raw json blocks", () => {
    const html = renderToStaticMarkup(
      <CaseDetail
        amount={12800}
        analysis={{
          summary: "从现有信息看，案件适合继续推进。",
          basis: ["付款事实明确"],
          risks: ["聊天承诺仍需补充"],
          next_steps: ["先整理付款和聊天记录"],
          materials: ["付款截图"],
          communication: "请贵方在合理期限内书面回复。",
          review_flag: "manual_review"
        }}
        clientName="王女士"
        contact="13800000000"
        id="case_1"
        intake={{
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
        }}
        operatorNotes=""
        scenario="education"
        status="new"
      />
    );

    expect(html).toContain("对方联系方式");
    expect(html).toContain("客户提交信息");
    expect(html).toContain("案件分析意见");
    expect(html).not.toContain("json-block");
    expect(html).not.toContain("{&quot;");
  });
});
