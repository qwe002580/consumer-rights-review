import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { AnalysisReport } from "../components/analysis-report";

const sampleResult = {
  summary: "从现有信息看，案件还需要进一步人工梳理。",
  basis: ["付款事实基本明确"],
  risks: ["商家沟通口径前后不一致", "关键承诺材料仍需补充", "平台处理结果不充分"],
  next_steps: ["先补齐付款记录和聊天截图"],
  materials: ["付款记录", "聊天记录"],
  communication: "请贵方在合理期限内书面回复。",
  review_flag: "manual_review" as const
};

afterEach(() => {
  delete process.env.NEXT_PUBLIC_CONSULTATION_URL;
});

describe("analysis report", () => {
  it("uses client-facing wording without mentioning ai", () => {
    const html = renderToStaticMarkup(
      <AnalysisReport goal="full_refund" result={sampleResult} scenario="education" />
    );

    expect(html).toContain("分析结果");
    expect(html).toContain("你的纠纷情况");
    expect(html).toContain("教培退费");
    expect(html).toContain("全额退款");
    expect(html).toContain("初步判断");
    expect(html).toContain("你现在缺少的关键材料");
    expect(html).toContain("第 1 步");
    expect(html).not.toContain("AI");
  });

  it("shows two focused material-list consultation actions", () => {
    process.env.NEXT_PUBLIC_CONSULTATION_URL = "https://work.weixin.qq.com/example";

    const html = renderToStaticMarkup(
      <AnalysisReport goal="full_refund" result={sampleResult} scenario="education" />
    );

    expect(html).toContain("领取你的专属材料清单");
    expect(html).toContain("发送“退款自测”");
    expect(html).toContain("添加微信领取清单");
    expect(html).toContain("https://work.weixin.qq.com/example");
    expect(html.match(/添加微信领取清单/g)?.length).toBe(2);
    expect(html).not.toContain("结果出来后建议尽快添加");
  });

  it("does not show the consultation button when no consultation url is configured", () => {
    const html = renderToStaticMarkup(
      <AnalysisReport goal="full_refund" result={sampleResult} scenario="education" />
    );

    expect(html).not.toContain("添加微信领取清单");
  });

  it("defines dedicated styles for result context, steps, and conversion", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain(".result-context");
    expect(css).toContain(".action-steps");
    expect(css).toContain(".conversion-card");
  });
});
