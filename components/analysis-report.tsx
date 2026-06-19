import React from "react";
import type { AnalysisOutput } from "@/lib/schema";
import { consultationLabel, getConsultationUrl } from "@/lib/site-config";

type AnalysisReportProps = {
  result: AnalysisOutput | null;
  error?: string | null;
  loading?: boolean;
};

function renderList(items: string[]) {
  return (
    <ul className="report-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function shouldShowConsultationPrompt(result: AnalysisOutput) {
  if (result.review_flag !== "self_service") {
    return true;
  }

  return result.risks.length >= 3;
}

function buildConsultationPrompt(result: AnalysisOutput) {
  switch (result.review_flag) {
    case "complex_high_risk":
      return "这类情况通常不只是补一句说明就能解决，往往更适合先做一次人工审查，再决定后续沟通和处理路径。";
    case "contact_soon":
      return "当前争议点已经比较集中，如果你希望减少来回沟通成本，通常建议尽快进入人工梳理。";
    case "manual_review":
      return "结合目前的风险点和材料情况，这类案件通常更适合进一步人工复核，避免后续反复补证或沟通走偏。";
    default:
      return "如果你不想自己反复整理材料，也可以考虑进一步人工审查，再进入下一步处理。";
  }
}

function ConsultationButton({ className, url }: { className: string; url: string }) {
  return (
    <a className={className} href={url} rel="noreferrer" target="_blank">
      {consultationLabel}
    </a>
  );
}

export function AnalysisReport({
  result,
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

      {consultationUrl ? (
        <article className="report-card consultation-banner">
          <strong>结果出来后建议尽快添加老师继续咨询</strong>
          <p>如果你希望有人帮你继续判断、梳理材料和下一步怎么推进，可以直接点下面按钮添加。</p>
          <ConsultationButton className="consultation-link consultation-link-hero" url={consultationUrl} />
        </article>
      ) : null}

      <article className="report-card emphasis-card">
        <h3>初步判断</h3>
        <p>{result.summary}</p>
        {consultationUrl ? (
          <div className="consultation-inline">
            <span>不想自己反复整理材料时，可以直接进入人工沟通。</span>
            <ConsultationButton className="consultation-link consultation-link-inline" url={consultationUrl} />
          </div>
        ) : null}
      </article>

      <div className="report-grid">
        <article className="report-card">
          <h3>维权基础</h3>
          {renderList(result.basis)}
        </article>
        <article className="report-card">
          <h3>主要风险</h3>
          {renderList(result.risks)}
        </article>
      </div>

      {shouldShowConsultationPrompt(result) ? (
        <article className="report-card consultation-card">
          <h3>进一步人工审查建议</h3>
          <p>{buildConsultationPrompt(result)}</p>
          {consultationUrl ? (
            <ConsultationButton className="consultation-link" url={consultationUrl} />
          ) : null}
        </article>
      ) : null}

      <div className="report-grid">
        <article className="report-card">
          <h3>建议下一步</h3>
          {renderList(result.next_steps)}
        </article>
        <article className="report-card">
          <h3>建议补充材料</h3>
          {renderList(result.materials)}
        </article>
      </div>

      <article className="report-card">
        <h3>沟通建议</h3>
        <p>{result.communication}</p>
      </article>

      {consultationUrl ? (
        <article className="report-card consultation-footer-card">
          <h3>想继续推进这件事？</h3>
          <p>如果你已经看完结果，下一步最直接的方式就是点击按钮，主动添加进来，我们再继续帮你判断和梳理。</p>
          <ConsultationButton className="consultation-link consultation-link-footer" url={consultationUrl} />
        </article>
      ) : null}
    </section>
  );
}
