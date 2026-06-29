import React from "react";
import {
  getGoalLabel,
  getReviewFlagLabel,
  getScenarioLabel,
  type PublicAnalysis
} from "@/lib/schema";
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

function renderList(items: string[], fallback: string) {
  const visibleItems = items.length ? items : [fallback];
  return (
    <ul className="report-list">
      {visibleItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function ConsultationButton({ className, url }: { className: string; url: string }) {
  return (
    <a className={className} href={url} rel="noreferrer" target="_blank">
      {consultationLabel}
    </a>
  );
}

function ConsultationCard({ className, url }: { className: string; url: string }) {
  return (
    <article className={`report-card conversion-card ${className}`}>
      <div>
        <h3>你的初步结果已生成</h3>
        <p>添加案件顾问，发送本次评估结果，进一步核对退款空间和处理重点。</p>
      </div>
      <ConsultationButton className="consultation-link" url={url} />
    </article>
  );
}

const opportunityLabels: Record<PublicAnalysis["opportunity"], string> = {
  high: "高",
  medium_high: "中高",
  medium: "中等",
  low: "低",
  unclear: "待核验"
};

const evidenceCompletenessLabels: Record<PublicAnalysis["evidenceCompleteness"], string> = {
  complete: "较完整",
  partial: "部分完整",
  insufficient: "不足",
  review_needed: "需要复核"
};

export function AnalysisReport({
  result,
  scenario,
  goal,
  assessmentNo: _assessmentNo,
  caseId: _caseId,
  leadScore: _leadScore,
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
      <div className="panel-header">
        <h2>分析结果</h2>
      </div>

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
          <div><span>材料完整度</span><strong>{evidenceCompletenessLabels[result.evidenceCompleteness]}</strong></div>
          <div><span>人工复核</span><strong>{result.manualReviewRecommended ? "建议人工复核" : "暂不需要"}</strong></div>
        </div>
      </article>

      {consultationUrl ? (
        <ConsultationCard className="conversion-card-top" url={consultationUrl} />
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
          <ConsultationCard className="conversion-card-footer" url={consultationUrl} />
          <div className="mobile-consultation-bar">
            <a href={consultationUrl} rel="noreferrer" target="_blank">
              {consultationLabel}
            </a>
          </div>
        </>
      ) : null}
    </section>
  );
}
