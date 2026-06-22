import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { AnalysisReport } from "../components/analysis-report";

const sampleResult = {
  summary: "本案涉及教培退费，付款事实明确，但仍需核对退款承诺。",
  favorable_factors: ["付款记录能够确认交易事实"],
  adverse_factors: ["关键退款承诺仍需补充"],
  first_step: "先整理付款记录、合同和关键聊天截图，并按时间排序。",
  later_stage_titles: ["核对合同和承诺材料", "评估后续处理路径"],
  materials: ["付款记录", "聊天记录"],
  probability: {
    full_success: { min: 30, max: 45 },
    substantive_result: { min: 55, max: 70 },
    confidence: "moderate" as const,
    factors: ["付款事实明确"]
  },
  review_flag: "manual_review" as const
};

afterEach(() => {
  delete process.env.NEXT_PUBLIC_CONSULTATION_URL;
});

describe("analysis report", () => {
  it("shows bounded probabilities and limited customer guidance", () => {
    const html = renderToStaticMarkup(
      <AnalysisReport goal="full_refund" result={sampleResult} scenario="education" />
    );

    expect(html).toContain("达成全部诉求概率");
    expect(html).toContain("取得实质处理结果概率");
    expect(html).toContain("30%–45%");
    expect(html).toContain("55%–70%");
    expect(html).toContain("第 1 步");
    expect(html).toContain("后续阶段");
    expect(html).toContain("核对合同和承诺材料");
    expect(html).not.toContain("沟通建议");
    expect(html).not.toContain("AI");
  });

  it("uses the confirmed consultation copy in two cards and one mobile bar", () => {
    process.env.NEXT_PUBLIC_CONSULTATION_URL = "https://work.weixin.qq.com/example";

    const html = renderToStaticMarkup(
      <AnalysisReport goal="full_refund" result={sampleResult} scenario="education" />
    );

    expect(html).toContain("你的初步结果已生成");
    expect(html).toContain("进一步核对退款空间和处理重点");
    expect(html.match(/添加顾问继续评估/g)?.length).toBe(3);
    expect(html).toContain("https://work.weixin.qq.com/example");
  });

  it("does not show consultation actions without a configured url", () => {
    const html = renderToStaticMarkup(
      <AnalysisReport goal="full_refund" result={sampleResult} scenario="education" />
    );

    expect(html).not.toContain("添加顾问继续评估");
  });

  it("defines probability, signal, and mobile consultation styles", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("--signal:");
    expect(css).toContain(".probability-grid");
    expect(css).toContain(".consultation-link");
    expect(css).toContain(".mobile-consultation-bar");
  });
});
