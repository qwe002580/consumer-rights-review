"use client";

import React from "react";
import { useState } from "react";
import {
  getGoalLabel,
  getPaymentMethodLabel,
  getReviewFlagLabel,
  getScenarioLabel,
  getStageLabel,
  type AnalysisOutput,
  normalizeIntakeForDisplay,
  type IntakeInput
} from "@/lib/schema";

type CaseDetailProps = {
  id: string;
  clientName: string;
  contact: string;
  scenario: string;
  amount: number;
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

export function CaseDetail(props: CaseDetailProps) {
  const [status, setStatus] = useState(props.status);
  const [operatorNotes, setOperatorNotes] = useState(props.operatorNotes);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const normalizedIntake =
    props.intake && typeof props.intake === "object"
      ? normalizeIntakeForDisplay(props.intake as IntakeInput)
      : props.intake;
  const analysis =
    props.analysis && typeof props.analysis === "object"
      ? (props.analysis as Partial<AnalysisOutput>)
      : null;
  const intake =
    normalizedIntake && typeof normalizedIntake === "object"
      ? (normalizedIntake as IntakeInput)
      : null;

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/cases/${props.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ status, operatorNotes })
      });

      if (!response.ok) {
        throw new Error("保存失败，请稍后再试。");
      }

      setMessage("已保存最新状态和备注。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="report-panel">
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
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
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
          {message ? <p className="muted-copy">{message}</p> : null}
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
              <div>
                <h4>情况概述</h4>
                <p className="detail-copy">{intake.summary || "客户暂未补充额外说明。"}</p>
              </div>
              <div>
                <h4>核心争议</h4>
                <ul className="report-list">
                  {intake.issues.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>已有材料</h4>
                <ul className="report-list">
                  {intake.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>当前障碍</h4>
                <ul className="report-list">
                  {(intake.obstacles.length ? intake.obstacles : ["暂未填写明显障碍"]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
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
                <div><span>处理建议</span><strong>{analysis.review_flag === "self_service" ? "可继续自助推进" : "建议优先人工跟进"}</strong></div>
              </div>
              <div>
                <h4>初步判断</h4>
                <p className="detail-copy">{analysis.summary}</p>
              </div>
              <div>
                <h4>维权基础</h4>
                <ul className="report-list">
                  {(analysis.basis ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>主要风险</h4>
                <ul className="report-list">
                  {(analysis.risks ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>建议下一步</h4>
                <ul className="report-list">
                  {(analysis.next_steps ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>建议补充材料</h4>
                <ul className="report-list">
                  {(analysis.materials ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>沟通建议</h4>
                <p className="detail-copy">{analysis.communication}</p>
              </div>
            </div>
          ) : (
            <p className="muted-copy">暂时无法读取案件分析结果。</p>
          )}
        </article>
      </div>
    </section>
  );
}
