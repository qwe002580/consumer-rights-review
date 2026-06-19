"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getCaseStatusLabel,
  getReviewFlagLabel,
  getScenarioLabel
} from "@/lib/schema";

export type CaseListItem = {
  id: string;
  clientName: string;
  contact: string;
  scenario: string;
  amount: number;
  status: string;
  reviewFlag: string | null;
  createdAt: Date;
  analysis: unknown;
};

type ReviewFilter = "all" | "complex_high_risk" | "contact_soon" | "manual_review";
type StatusFilter = "all" | "new" | "reviewed" | "contacted" | "on_hold" | "closed";

const reviewPriority: Record<string, number> = {
  complex_high_risk: 4,
  contact_soon: 3,
  manual_review: 2,
  self_service: 1
};

const reviewFilters: Array<{ value: ReviewFilter; label: string }> = [
  { value: "all", label: "全部风险" },
  { value: "complex_high_risk", label: "高风险复杂" },
  { value: "contact_soon", label: "尽快联系" },
  { value: "manual_review", label: "人工复核" }
];

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "new", label: "新提交" },
  { value: "reviewed", label: "已复核" },
  { value: "contacted", label: "已联系" },
  { value: "on_hold", label: "暂缓处理" },
  { value: "closed", label: "已关闭" }
];

export function filterAndSortCases(
  cases: CaseListItem[],
  reviewFilter: ReviewFilter,
  statusFilter: StatusFilter
) {
  return cases
    .filter((item) => reviewFilter === "all" || item.reviewFlag === reviewFilter)
    .filter((item) => statusFilter === "all" || item.status === statusFilter)
    .sort((a, b) => {
      const priorityDifference =
        (reviewPriority[b.reviewFlag ?? ""] ?? 0) -
        (reviewPriority[a.reviewFlag ?? ""] ?? 0);

      return priorityDifference || b.createdAt.getTime() - a.createdAt.getTime();
    });
}

function getSummary(analysis: unknown) {
  if (!analysis || typeof analysis !== "object") {
    return "暂无分析摘要";
  }

  const summary = (analysis as { summary?: unknown }).summary;
  return typeof summary === "string" ? summary : "暂无分析摘要";
}

export function CaseTable({ cases }: { cases: CaseListItem[] }) {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  if (!cases.length) {
    return (
      <section className="report-panel">
        <div className="panel-header">
          <p className="eyebrow">Cases</p>
          <h2>案件记录</h2>
        </div>
        <p className="muted-copy">目前还没有案件记录。用户提交评估信息后，这里会自动出现案件列表。</p>
      </section>
    );
  }

  const visibleCases = filterAndSortCases(cases, reviewFilter, statusFilter);
  const urgentCount = cases.filter((item) =>
    ["complex_high_risk", "contact_soon"].includes(item.reviewFlag ?? "")
  ).length;
  const newCount = cases.filter((item) => item.status === "new").length;

  return (
    <section className="case-workbench">
      <div className="workbench-heading">
        <div>
          <p className="eyebrow">案件处理工作台</p>
          <h1>优先处理需要关注的案件</h1>
          <p className="muted-copy">系统已根据分析结果自动排序，风险越高越靠前。</p>
        </div>
        <Link className="workbench-home-link" href="/">查看客户提交页</Link>
      </div>

      <div className="case-stats" aria-label="案件概览">
        <article>
          <span>全部案件</span>
          <strong>{cases.length}</strong>
        </article>
        <article className={urgentCount ? "urgent" : ""}>
          <span>优先联系</span>
          <strong>{urgentCount}</strong>
        </article>
        <article>
          <span>新提交</span>
          <strong>{newCount}</strong>
        </article>
      </div>

      <div className="workbench-filters" aria-label="案件筛选">
        <label>
          <span>风险程度</span>
          <select
            value={reviewFilter}
            onChange={(event) => setReviewFilter(event.target.value as ReviewFilter)}
          >
            {reviewFilters.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>处理状态</span>
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
              <th>客户与案件</th>
              <th>风险判断</th>
              <th>涉及金额</th>
              <th>处理状态</th>
              <th>提交时间</th>
              <th><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleCases.map((item) => (
              <tr className={`case-row priority-${item.reviewFlag ?? "none"}`} key={item.id}>
                <td>
                  <a className="table-link" href={`/cases/${item.id}`}>
                    {item.clientName}
                  </a>
                  <span className="case-meta">{getScenarioLabel(item.scenario)} · {item.contact}</span>
                </td>
                <td>
                  <span className={`risk-badge risk-${item.reviewFlag ?? "none"}`}>
                    {getReviewFlagLabel(item.reviewFlag)}
                  </span>
                  <span className="case-summary">{getSummary(item.analysis)}</span>
                </td>
                <td className="amount-cell">¥{item.amount.toLocaleString("zh-CN")}</td>
                <td><span className={`status-badge status-${item.status}`}>{getCaseStatusLabel(item.status)}</span></td>
                <td className="date-cell">{item.createdAt.toLocaleString("zh-CN")}</td>
                <td><a className="row-action" href={`/cases/${item.id}`}>查看详情</a></td>
              </tr>
            ))}
          </tbody>
        </table>
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
