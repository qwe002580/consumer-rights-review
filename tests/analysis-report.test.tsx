import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AnalysisReport,
  copyAssessmentNumber
} from "../components/analysis-report";

const sampleResult = {
  summary: "本案涉及教培退费，付款事实明确，但仍需核对退款承诺。",
  opportunity: "medium_high" as const,
  evidenceCompleteness: "partial" as const,
  riskPoints: ["关键退款承诺仍需补充"],
  materialGaps: ["宣传承诺截图"],
  manualReviewRecommended: true,
  review_flag: "manual_review" as const
};

afterEach(() => {
  delete process.env.NEXT_PUBLIC_CONSULTATION_URL;
});

describe("analysis report", () => {
  it("renders only the basic public diagnostic fields", () => {
    const html = renderToStaticMarkup(
      <AnalysisReport
        assessmentNo="11399-20260629-0081"
        caseId="case_123"
        goal="full_refund"
        leadScore="A"
        result={sampleResult}
        scenario="education"
      />
    );

    expect(html).toContain("你的初步评估已生成");
    expect(html).toContain("评估编号：11399-20260629-0081");
    expect(html).toContain("处理机会");
    expect(html).toContain("中高");
    expect(html).toContain("证据完整度");
    expect(html).toContain("部分完整");
    expect(html).toContain(sampleResult.summary);
    expect(html).toContain("关键退款承诺仍需补充");
    expect(html).toContain("宣传承诺截图");
    expect(html).toContain("建议先做一次人工复核");
    expect(html).not.toContain("概率");
    expect(html).not.toContain("第 1 步");
    expect(html).not.toContain("后续阶段");
  });

  it("keeps the existing consultation actions when configured", () => {
    process.env.NEXT_PUBLIC_CONSULTATION_URL = "https://work.weixin.qq.com/example";
    const html = renderToStaticMarkup(
      <AnalysisReport
        assessmentNo="11399-20260629-0081"
        caseId="case_123"
        goal="full_refund"
        result={sampleResult}
        scenario="education"
      />
    );

    expect(html.match(/添加企业微信，免费复核/g)?.length).toBe(3);
    expect(html).toContain("https://work.weixin.qq.com/example");
    expect(html).toContain("复制评估编号");
  });

  it("limits public risk and material lists to four items", () => {
    const html = renderToStaticMarkup(
      <AnalysisReport
        assessmentNo="11399-20260629-0081"
        goal="full_refund"
        result={{
          ...sampleResult,
          riskPoints: ["风险1", "风险2", "风险3", "风险4", "风险5"],
          materialGaps: ["材料1", "材料2", "材料3", "材料4", "材料5"]
        }}
        scenario="education"
      />
    );

    expect(html).toContain("风险4");
    expect(html).not.toContain("风险5");
    expect(html).toContain("材料4");
    expect(html).not.toContain("材料5");
  });

  it("copies only the assessment number", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await copyAssessmentNumber("11399-20260629-0081", {
      writeText,
      legacyCopy: vi.fn()
    });

    expect(writeText).toHaveBeenCalledWith("11399-20260629-0081");
    expect(writeText).not.toHaveBeenCalledWith(expect.stringContaining("本案涉及"));
  });

  it("does not show consultation actions without a configured url", () => {
    const html = renderToStaticMarkup(
      <AnalysisReport
        assessmentNo="11399-20260629-0081"
        caseId="case_123"
        goal="full_refund"
        result={sampleResult}
        scenario="education"
      />
    );
    expect(html).not.toContain("添加企业微信，免费复核");
  });
});
