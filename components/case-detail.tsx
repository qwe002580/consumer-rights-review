"use client";

import React from "react";
import { useState } from "react";
import { buildInternalCaseSummary } from "@/lib/case-copy";
import {
  getGoalLabel,
  getPaymentMethodLabel,
  getReviewFlagLabel,
  getScenarioLabel,
  getStageLabel,
  intakeSchema,
  normalizeIntakeForDisplay,
  normalizeStoredAnalysis
} from "@/lib/schema";

type CaseDetailProps = {
  id: string;
  clientName: string;
  contact: string;
  scenario: string;
  amount: number;
  createdAt: string;
  status: string;
  operatorNotes: string;
  intake: unknown;
  analysis: unknown;
};

const statusOptions = [
  { value: "new", label: "新提交" },
  { value: "reviewed", label: "已复核" },
  { value: "contacted", label: "已联系" },
  { value: "on_hold", label: "暂缓处理" },
  { value: "closed", label: "已关闭" }
];

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}

function renderList(items: string[], fallback = "暂未生成") {
  return (
    <ul className="report-list">
      {(items.length ? items : [fallback]).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function rangeLabel(range: { min: number; max: number } | undefined) {
  return range ? `${range.min}%–${range.max}%` : "尚未评估";
}

export function CaseDetail(props: CaseDetailProps) {
  const [status, setStatus] = useState(props.status);
  const [operatorNotes, setOperatorNotes] = useState(props.operatorNotes);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedIntake = intakeSchema.safeParse(props.intake);
  const intake = parsedIntake.success
    ? normalizeIntakeForDisplay(parsedIntake.data)
    : null;
  const analysis = normalizeStoredAnalysis(props.analysis);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/cases/${props.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, operatorNotes })
      });
      if (!response.ok) throw new Error("保存失败，请稍后再试。");
      setMessage("已保存最新状态和备注。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    setMessage(null);
    try {
      await copyText(
        buildInternalCaseSummary({
          ...props,
          status,
          operatorNotes
        })
      );
      setMessage("已复制内部案件摘要。");
    } catch {
      setMessage("复制失败，请手动选择案件内容。");
    }
  }

  return (
    <section className="report-panel">
      <div className="case-detail-actions">
        <a className="admin-back-link" href="/cases">返回案件列表</a>
        <button className="copy-case-button" onClick={handleCopy} type="button">
          一键复制内部案件摘要
        </button>
      </div>

      <div className="panel-header">
        <p className="eyebrow">Case Detail</p>
        <h2>{props.clientName} 的案件详情</h2>
      </div>

      <div className="report-grid">
        <article className="report-card">
          <h3>基本信息</h3>
          <div className="detail-list">
            <div><span>客户称呼</span><strong>{props.clientName}</strong></div>
            <div><span>客户联系方式</span><strong>{props.contact}</strong></div>
            <div><span>纠纷类型</span><strong>{getScenarioLabel(props.scenario)}</strong></div>
            <div><span>支付金额</span><strong>¥{props.amount.toLocaleString("zh-CN")}</strong></div>
          </div>
        </article>
        <article className="report-card">
          <h3>处理状态</h3>
          <label className="stack-field">
            <span>当前状态</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="stack-field">
            <span>人工备注</span>
            <textarea
              rows={6}
              value={operatorNotes}
              onChange={(event) => setOperatorNotes(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={saving} onClick={handleSave} type="button">
            {saving ? "保存中..." : "保存状态"}
          </button>
          {message ? <p className="admin-action-message" role="status">{message}</p> : null}
        </article>
      </div>

      <div className="report-grid">
        <article className="report-card">
          <h3>客户提交信息</h3>
          {intake ? (
            <div className="detail-section-stack">
              <div className="detail-list">
                <div><span>付款时间</span><strong>{intake.purchaseDate}</strong></div>
                <div><span>付款方式</span><strong>{getPaymentMethodLabel(intake.paymentMethod)}</strong></div>
                <div><span>当前进度</span><strong>{getStageLabel(intake.stage)}</strong></div>
                <div><span>目标诉求</span><strong>{getGoalLabel(intake.goal)}</strong></div>
              </div>
              <div><h4>情况概述</h4><p className="detail-copy">{intake.summary || "客户暂未补充额外说明。"}</p></div>
              <div><h4>核心争议</h4>{renderList(intake.issues)}</div>
              <div><h4>已有材料</h4>{renderList(intake.evidence)}</div>
              <div><h4>当前障碍</h4>{renderList(intake.obstacles, "暂未填写明显障碍")}</div>
            </div>
          ) : (
            <p className="muted-copy">暂时无法读取客户提交信息。</p>
          )}
        </article>

        <article className="report-card">
          <h3>案件分析意见</h3>
          {analysis ? (
            <div className="detail-section-stack">
              <div className="detail-list">
                <div><span>风险判断</span><strong>{getReviewFlagLabel(analysis.review_flag)}</strong></div>
                <div><span>达成全部诉求概率</span><strong>{rangeLabel(analysis.probability?.full_success)}</strong></div>
                <div><span>取得实质处理结果概率</span><strong>{rangeLabel(analysis.probability?.substantive_result)}</strong></div>
              </div>
              <div><h4>初步判断</h4><p className="detail-copy">{analysis.summary}</p></div>
              <div><h4>有利因素</h4>{renderList(analysis.favorable_factors)}</div>
              <div><h4>不利因素</h4>{renderList(analysis.adverse_factors)}</div>
              <div><h4>决定性问题</h4>{renderList(analysis.decisive_issues)}</div>
              <div><h4>完整处理策略</h4><p className="detail-copy">{analysis.strategy}</p></div>
              <div><h4>完整处理步骤</h4>
                <ol className="admin-numbered-list">
                  {analysis.next_steps.map((item) => <li key={item}>{item}</li>)}
                </ol>
              </div>
              <div><h4>建议补充材料</h4>{renderList(analysis.materials)}</div>
              <div><h4>沟通建议</h4><p className="detail-copy">{analysis.communication}</p></div>
            </div>
          ) : (
            <p className="muted-copy">暂时无法读取案件分析结果。</p>
          )}
        </article>
      </div>
    </section>
  );
}
