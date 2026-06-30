"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getCaseStatusLabel,
  getReceiveMethodLabel,
  getScenarioLabel,
  normalizeCaseStatus
} from "@/lib/schema";

export type CaseListItem = {
  id: string;
  assessmentNo: string | null;
  clientName: string;
  contact: string;
  receiveMethod: string;
  leadScore: string;
  addedWechat: boolean;
  scenario: string;
  amount: number;
  status: string;
  reviewFlag: string | null;
  createdAt: Date;
  analysis: unknown;
};

type GradeFilter = "all" | "A" | "B" | "C";
type StatusFilter =
  | "all"
  | "uncontacted"
  | "wechat_added"
  | "no_answer"
  | "communicated"
  | "strong_interest"
  | "not_now"
  | "converted"
  | "invalid";

const gradePriority: Record<string, number> = { A: 3, B: 2, C: 1 };

const gradeFilters: Array<{ value: GradeFilter; label: string }> = [
  { value: "all", label: "全部等级" },
  { value: "A", label: "A 级优先" },
  { value: "B", label: "B 级跟进" },
  { value: "C", label: "C 级观察" }
];

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "uncontacted", label: "未联系" },
  { value: "wechat_added", label: "已加企微" },
  { value: "no_answer", label: "未接通" },
  { value: "communicated", label: "已沟通" },
  { value: "strong_interest", label: "强意向" },
  { value: "not_now", label: "暂不处理" },
  { value: "converted", label: "已转化" },
  { value: "invalid", label: "无效线索" }
];

export function filterAndSortCases(
  cases: CaseListItem[],
  gradeFilter: GradeFilter,
  statusFilter: StatusFilter
) {
  return cases
    .filter((item) => gradeFilter === "all" || item.leadScore === gradeFilter)
    .filter((item) => statusFilter === "all" || normalizeCaseStatus(item.status) === statusFilter)
    .sort((a, b) => {
      const gradeDifference =
        (gradePriority[b.leadScore] ?? 0) - (gradePriority[a.leadScore] ?? 0);

      return gradeDifference || b.createdAt.getTime() - a.createdAt.getTime();
    });
}

function getSummary(analysis: unknown) {
  if (!analysis || typeof analysis !== "object") return "暂无分析摘要";
  const summary = (analysis as { summary?: unknown }).summary;
  return typeof summary === "string" ? summary : "暂无分析摘要";
}

function formatAmount(amount: number) {
  return `¥${amount.toLocaleString("zh-CN")}`;
}

function formatDate(date: Date) {
  return date.toLocaleString("zh-CN");
}

export function CaseTable({ cases }: { cases: CaseListItem[] }) {
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  if (!cases.length) {
    return (
      <section className="report-panel">
        <div className="panel-header">
          <p className="eyebrow">案件处理工作台</p>
          <h2>案件记录</h2>
        </div>
        <p className="muted-copy">目前还没有案件记录。用户提交评估信息后，这里会自动出现案件列表。</p>
      </section>
    );
  }

  const visibleCases = filterAndSortCases(cases, gradeFilter, statusFilter);
  const priorityCount = cases.filter((item) => item.leadScore === "A").length;
  const addedCount = cases.filter((item) => item.addedWechat).length;

  return (
    <section className="case-workbench">
      <div className="workbench-heading">
        <div>
          <p className="eyebrow">案件处理工作台</p>
          <h1>优先处理高意向退款线索</h1>
          <p className="muted-copy">系统按线索等级和提交时间排序，先看 A 级和已点击企微的客户。</p>
        </div>
        <Link className="workbench-home-link" href="/">查看客户提交页</Link>
      </div>

      <div className="case-stats" aria-label="案件概览">
        <article>
          <span>全部案件</span>
          <strong>{cases.length}</strong>
        </article>
        <article className={priorityCount ? "urgent" : ""}>
          <span>A 级线索</span>
          <strong>{priorityCount}</strong>
        </article>
        <article>
          <span>已点击企微</span>
          <strong>{addedCount}</strong>
        </article>
      </div>

      <div className="workbench-filters" aria-label="案件筛选">
        <label>
          <span>线索等级</span>
          <select
            value={gradeFilter}
            onChange={(event) => setGradeFilter(event.target.value as GradeFilter)}
          >
            {gradeFilters.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>跟进状态</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            {statusFilters.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <p>当前显示 <strong>{visibleCases.length}</strong> 个案件</p>
      </div>

      <div className="admin-table-wrap workbench-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>评估编号 / 客户</th>
              <th>线索等级</th>
              <th>接收方式</th>
              <th>纠纷 / 金额</th>
              <th>企微状态</th>
              <th>跟进状态</th>
              <th>提交时间</th>
              <th><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleCases.map((item) => (
              <tr className={`case-row lead-${item.leadScore}`} key={item.id}>
                <td>
                  <a className="table-link" href={`/cases/${item.id}`}>
                    {item.assessmentNo || item.id}
                  </a>
                  <span className="case-meta">
                    {item.clientName} · 客户联系方式：{item.contact || "未留"}
                  </span>
                </td>
                <td>
                  <span className={`lead-badge lead-${item.leadScore}`}>
                    {item.leadScore || "C"} 级
                  </span>
                  <span className="case-summary">{getSummary(item.analysis)}</span>
                </td>
                <td>{getReceiveMethodLabel(item.receiveMethod)}</td>
                <td>
                  <strong>{getScenarioLabel(item.scenario)}</strong>
                  <span className="case-meta amount-cell">{formatAmount(item.amount)}</span>
                </td>
                <td>
                  <span className={`status-badge ${item.addedWechat ? "status-converted" : ""}`}>
                    {item.addedWechat ? "已点击企微" : "未点击企微"}
                  </span>
                </td>
                <td><span className={`status-badge status-${item.status}`}>{getCaseStatusLabel(item.status)}</span></td>
                <td className="date-cell">{formatDate(item.createdAt)}</td>
                <td><a className="row-action" href={`/cases/${item.id}`}>查看详情</a></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="workbench-card-list">
          {visibleCases.map((item) => (
            <article className={`workbench-case-card lead-${item.leadScore}`} key={item.id}>
              <div>
                <span className="case-meta">评估编号</span>
                <Link className="table-link" href={`/cases/${item.id}`}>
                  {item.assessmentNo || item.id}
                </Link>
              </div>
              <strong>{item.clientName} · {formatAmount(item.amount)}</strong>
              <p>{getScenarioLabel(item.scenario)} · 接收方式：{getReceiveMethodLabel(item.receiveMethod)}</p>
              <div className="case-card-tags">
                <span className={`lead-badge lead-${item.leadScore}`}>{item.leadScore || "C"} 级</span>
                <span className="status-badge">{item.addedWechat ? "已点击企微" : "未点击企微"}</span>
                <span className={`status-badge status-${item.status}`}>{getCaseStatusLabel(item.status)}</span>
              </div>
              <Link className="row-action" href={`/cases/${item.id}`}>查看详情</Link>
            </article>
          ))}
        </div>

        {!visibleCases.length ? (
          <div className="workbench-empty">
            <strong>没有符合当前条件的案件</strong>
            <span>换一个筛选条件即可查看其他案件。</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
