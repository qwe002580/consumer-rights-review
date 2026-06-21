import React from "react";
import {
  getGoalLabel,
  getReviewFlagLabel,
  getScenarioLabel,
  type AnalysisOutput
} from "@/lib/schema";
import { consultationLabel, getConsultationUrl } from "@/lib/site-config";

type AnalysisReportProps = {
  result: AnalysisOutput | null;
  scenario: string;
  goal: string;
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
        <h3>领取你的专属材料清单</h3>
        <p>添加微信，发送“退款自测”，继续梳理材料和处理路径。</p>
      </div>
      <ConsultationButton className="consultation-link" url={url} />
    </article>
  );
}

export function AnalysisReport({
  result,
  scenario,
  goal,
  error = null,
  loading = false
}: AnalysisReportProps) {
  const consultationUrl = getConsultationUrl();

  if (loading) {
    return (
      <section className="report-panel">
        <div className="panel-header">
          <p className="eyebrow">Case Review</p>
          <h2>正在整理结果</h2>
        </div>
        <p className="muted-copy">系统正在结合你提交的事实信息生成结构化初步判断。</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="report-panel">
        <div className="panel-header">
          <p className="eyebrow">Case Review</p>
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
          <p className="eyebrow">Case Review</p>
          <h2>分析结果</h2>
        </div>
        <p className="muted-copy">
          填写交易事实、核心争议和已有材料后，这里会显示案件判断、风险点和建议下一步。
        </p>
      </section>
    );
  }

  return (
    <section className="report-panel">
      <div className="panel-header">
        <p className="eyebrow">Case Review</p>
        <h2>分析结果</h2>
      </div>

      <article className="report-card result-context">
        <h3>你的纠纷情况</h3>
        <div className="result-context-grid">
          <div>
            <span>纠纷类型</span>
            <strong>{getScenarioLabel(scenario)}</strong>
          </div>
          <div>
            <span>目标诉求</span>
            <strong>{getGoalLabel(goal)}</strong>
          </div>
          <div>
            <span>处理倾向</span>
            <strong>{getReviewFlagLabel(result.review_flag)}</strong>
          </div>
        </div>
      </article>

      {consultationUrl ? (
        <ConsultationCard className="conversion-card-top" url={consultationUrl} />
      ) : null}

      <article className="report-card emphasis-card">
        <h3>初步判断</h3>
        <p>{result.summary}</p>
      </article>

      <article className="report-card materials-card">
        <h3>你现在缺少的关键材料</h3>
        {renderList(result.materials, "根据目前填写信息，暂未识别到明确缺失材料。")}
      </article>

      <article className="report-card action-card">
        <h3>下一步建议</h3>
        <ol className="action-steps">
          {(result.next_steps.length
            ? result.next_steps
            : ["先整理现有付款、沟通和合同材料，再决定后续处理方式。"]
          ).map((item, index) => (
            <li key={item}>
              <span>第 {index + 1} 步</span>
              <p>{item}</p>
            </li>
          ))}
        </ol>
      </article>

      <div className="report-grid">
        <article className="report-card">
          <h3>维权基础</h3>
          {renderList(result.basis, "根据目前填写信息，暂未识别到明确推进基础。")}
        </article>
        <article className="report-card">
          <h3>主要风险</h3>
          {renderList(result.risks, "根据目前填写信息，暂未识别到明确风险点。")}
        </article>
      </div>

      <article className="report-card">
        <h3>沟通建议</h3>
        <p>{result.communication}</p>
      </article>

      {consultationUrl ? (
        <ConsultationCard className="conversion-card-footer" url={consultationUrl} />
      ) : null}
    </section>
  );
}
