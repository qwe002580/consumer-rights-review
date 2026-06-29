"use client";

import React, { useState } from "react";
import {
  getGoalLabel,
  getReviewFlagLabel,
  getScenarioLabel,
  type PublicAnalysis
} from "@/lib/schema";
import { copyTextWithFallback } from "@/lib/clipboard";
import { consultationLabel, getConsultationUrl } from "@/lib/site-config";

type AnalysisReportProps = {
  result: PublicAnalysis | null;
  scenario: string;
  goal: string;
  assessmentNo?: string;
  caseId?: string;
  leadScore?: string;
  error?: string | null;
  loading?: boolean;
};

export async function copyAssessmentNumber(
  assessmentNo: string,
  strategies: Parameters<typeof copyTextWithFallback>[1]
) {
  await copyTextWithFallback(assessmentNo, strategies);
}

function renderList(items: string[], fallback: string) {
  const visibleItems = items.length ? items.slice(0, 4) : [fallback];
  return (
    <ul className="report-list">
      {visibleItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

const opportunityLabels: Record<PublicAnalysis["opportunity"], string> = {
  high: "较高",
  medium_high: "中高",
  medium: "中等",
  low: "偏低",
  unclear: "待核验"
};

const evidenceCompletenessLabels: Record<PublicAnalysis["evidenceCompleteness"], string> = {
  complete: "较完整",
  partial: "部分完整",
  insufficient: "不足",
  review_needed: "需要复核"
};

const leadScoreCopy: Record<string, string> = {
  A: "建议优先人工复核",
  B: "建议补充后复核",
  C: "可先保存结果"
};

function CopyAssessmentButton({ assessmentNo }: { assessmentNo?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!assessmentNo) return null;
  const valueToCopy = assessmentNo;

  async function copy() {
    try {
      await copyAssessmentNumber(valueToCopy, {
        writeText: navigator.clipboard?.writeText.bind(navigator.clipboard),
        legacyCopy: (text) => {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.setAttribute("readonly", "");
          textarea.style.left = "-9999px";
          textarea.style.position = "fixed";
          document.body.appendChild(textarea);
          textarea.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(textarea);
          return ok;
        }
      });
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  }

  return (
    <button className="copy-assessment-button" type="button" onClick={copy}>
      {copied ? "已复制编号" : failed ? "复制失败，请手动保存编号" : "复制评估编号"}
    </button>
  );
}

function ConsultationButton({
  assessmentNo,
  caseId,
  className,
  url
}: {
  assessmentNo?: string;
  caseId?: string;
  className: string;
  url: string;
}) {
  async function markAddedWechat() {
    if (!caseId || !assessmentNo) return;
    try {
      await fetch(`/api/cases/${encodeURIComponent(caseId)}/added-wechat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessmentNo })
      });
    } catch {
      // Do not block the customer from opening Enterprise WeChat.
    }
  }

  return (
    <a
      className={className}
      href={url}
      rel="noreferrer"
      target="_blank"
      onClick={markAddedWechat}
    >
      {consultationLabel}
    </a>
  );
}

function ConsultationCard({
  assessmentNo,
  caseId,
  className,
  url
}: {
  assessmentNo?: string;
  caseId?: string;
  className: string;
  url: string;
}) {
  return (
    <article className={`report-card conversion-card ${className}`}>
      <div>
        <h3>建议先做一次人工复核</h3>
        <p>添加企业微信后，发送“退款自测”和评估编号，老师会先帮你核对材料缺口。</p>
        {assessmentNo ? <p className="assessment-inline">评估编号：{assessmentNo}</p> : null}
      </div>
      <div className="conversion-actions">
        <ConsultationButton
          assessmentNo={assessmentNo}
          caseId={caseId}
          className="consultation-link"
          url={url}
        />
        <CopyAssessmentButton assessmentNo={assessmentNo} />
      </div>
    </article>
  );
}

export function AnalysisReport({
  result,
  scenario,
  goal,
  assessmentNo,
  caseId,
  leadScore,
  error = null,
  loading = false
}: AnalysisReportProps) {
  const consultationUrl = getConsultationUrl();

  if (loading) {
    return (
      <section className="report-panel">
        <div className="panel-header">
          <h2>正在整理结果</h2>
        </div>
        <p className="muted-copy">系统正在结合你提交的事实和材料生成初步判断。</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="report-panel">
        <div className="panel-header">
          <h2>暂时无法生成结果</h2>
        </div>
        <p className="muted-copy">{error}</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="report-panel">
        <div className="panel-header">
          <h2>分析结果</h2>
        </div>
        <p className="muted-copy">
          填写交易事实、核心争议和已有材料后，这里会显示案件判断和处理空间。
        </p>
      </section>
    );
  }

  return (
    <section className="report-panel">
      <article className="report-card result-hero-card">
        <div>
          <p className="result-status">你的初步评估已生成</p>
          <h2>先保存编号，再核对关键材料</h2>
          {assessmentNo ? <p className="assessment-number">评估编号：{assessmentNo}</p> : null}
        </div>
        <div className="result-score-badge">
          <span>复核建议</span>
          <strong>{leadScore ? leadScoreCopy[leadScore] ?? "建议人工判断" : "建议人工判断"}</strong>
        </div>
      </article>

      <article className="report-card result-context">
        <h3>你的纠纷情况</h3>
        <div className="result-context-grid">
          <div><span>纠纷类型</span><strong>{getScenarioLabel(scenario)}</strong></div>
          <div><span>目标诉求</span><strong>{getGoalLabel(goal)}</strong></div>
          <div><span>处理倾向</span><strong>{getReviewFlagLabel(result.review_flag)}</strong></div>
        </div>
      </article>

      <article className="report-card result-context">
        <h3>诊断概览</h3>
        <div className="result-context-grid">
          <div><span>处理机会</span><strong>{opportunityLabels[result.opportunity]}</strong></div>
          <div><span>证据完整度</span><strong>{evidenceCompletenessLabels[result.evidenceCompleteness]}</strong></div>
          <div><span>人工复核</span><strong>{result.manualReviewRecommended ? "建议先做一次人工复核" : "可先保存结果"}</strong></div>
        </div>
      </article>

      {consultationUrl ? (
        <ConsultationCard
          assessmentNo={assessmentNo}
          caseId={caseId}
          className="conversion-card-top"
          url={consultationUrl}
        />
      ) : null}

      <article className="report-card emphasis-card">
        <h3>核心判断</h3>
        <p>{result.summary}</p>
      </article>

      <article className="report-card">
        <h3>主要风险</h3>
        {renderList(result.riskPoints, "暂未识别到明确风险。")}
      </article>

      <article className="report-card materials-card">
        <h3>你现在缺少的关键材料</h3>
        {renderList(result.materialGaps, "根据目前填写信息，暂未识别到明确缺失材料。")}
      </article>

      {consultationUrl ? (
        <>
          <ConsultationCard
            assessmentNo={assessmentNo}
            caseId={caseId}
            className="conversion-card-footer"
            url={consultationUrl}
          />
          <div className="mobile-consultation-bar">
            <ConsultationButton
              assessmentNo={assessmentNo}
              caseId={caseId}
              className=""
              url={consultationUrl}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
