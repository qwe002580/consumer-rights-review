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

function rangeLabel(range: { min: number; max: number }) {
  return `${range.min}%–${range.max}%`;
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
        <p className="muted-copy">系统正在结合你提交的事实和材料生成初步判断。</p>
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
          填写交易事实、核心争议和已有材料后，这里会显示案件判断和处理空间。
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
          <div><span>纠纷类型</span><strong>{getScenarioLabel(scenario)}</strong></div>
          <div><span>目标诉求</span><strong>{getGoalLabel(goal)}</strong></div>
          <div><span>处理倾向</span><strong>{getReviewFlagLabel(result.review_flag)}</strong></div>
        </div>
      </article>

      <article className="report-card probability-card">
        <div className="probability-heading">
          <div>
            <span>基于当前信息</span>
            <h3>处理结果概率区间</h3>
          </div>
          <small>材料变化会影响区间</small>
        </div>
        <div className="probability-grid">
          <div>
            <span>达成全部诉求概率</span>
            <strong>{rangeLabel(result.probability.full_success)}</strong>
            <p>实现你填写的完整目标诉求</p>
          </div>
          <div className="probability-primary">
            <span>取得实质处理结果概率</span>
            <strong>{rangeLabel(result.probability.substantive_result)}</strong>
            <p>获得退款、减免、补偿或合同调整等实质结果</p>
          </div>
        </div>
        <p className="probability-note">
          以上为当前信息下的评估区间，不构成结果承诺；补充关键材料后可能发生变化。
        </p>
      </article>

      {consultationUrl ? (
        <ConsultationCard className="conversion-card-top" url={consultationUrl} />
      ) : null}

      <article className="report-card emphasis-card">
        <h3>核心判断</h3>
        <p>{result.summary}</p>
      </article>

      <div className="report-grid">
        <article className="report-card">
          <h3>当前有利因素</h3>
          {renderList(result.favorable_factors, "暂未识别到明确有利因素。")}
        </article>
        <article className="report-card">
          <h3>主要风险</h3>
          {renderList(result.adverse_factors, "暂未识别到明确风险。")}
        </article>
      </div>

      <article className="report-card materials-card">
        <h3>你现在缺少的关键材料</h3>
        {renderList(result.materials, "根据目前填写信息，暂未识别到明确缺失材料。")}
      </article>

      <article className="report-card action-card">
        <h3>你现在可以先做什么</h3>
        <ol className="action-steps">
          <li>
            <span>第 1 步</span>
            <p>{result.first_step}</p>
          </li>
        </ol>
      </article>

      <article className="report-card later-stages-card">
        <h3>后续阶段</h3>
        <div className="later-stage-list">
          {result.later_stage_titles.map((title, index) => (
            <div key={title}>
              <span>{String(index + 2).padStart(2, "0")}</span>
              <strong>{title}</strong>
            </div>
          ))}
        </div>
        <p>后续顺序和具体做法需要结合完整材料进一步确认。</p>
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
