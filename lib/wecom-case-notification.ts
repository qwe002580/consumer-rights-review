import {
  getReviewFlagLabel,
  getScenarioLabel,
  getStageLabel
} from "./schema";

export type NewCaseNotification = {
  id: string;
  scenario: string;
  amount: number;
  stage: string;
  reviewFlag?: string | null;
  createdAt: Date;
  siteUrl: string;
};

export type NotificationStatus = "sent" | "skipped" | "failed";
type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

function normalizeSiteUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function buildNewCaseNotification(input: NewCaseNotification) {
  const detailUrl = `${normalizeSiteUrl(input.siteUrl)}/cases/${encodeURIComponent(input.id)}`;
  const amount = new Intl.NumberFormat("zh-CN").format(input.amount);
  const submittedAt = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai"
  }).format(input.createdAt);

  return [
    "## 新退款纠纷案件",
    `> 案件编号：${input.id}`,
    `> 纠纷类型：${getScenarioLabel(input.scenario)}`,
    `> 支付金额：¥${amount}`,
    `> 当前进度：${getStageLabel(input.stage)}`,
    `> 处理优先级：${getReviewFlagLabel(input.reviewFlag)}`,
    `> 提交时间：${submittedAt}`,
    `[进入案件后台查看详情](${detailUrl})`
  ].join("\n");
}

export async function sendNewCaseNotification(
  input: NewCaseNotification,
  fetchImpl: FetchLike = fetch
): Promise<NotificationStatus> {
  const webhookUrl = process.env.WECOM_CASE_WEBHOOK_URL?.trim();
  if (!webhookUrl) return "skipped";

  try {
    const response = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: { content: buildNewCaseNotification(input) }
      }),
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return "failed";

    const result = (await response.json()) as { errcode?: number };
    return result.errcode === 0 ? "sent" : "failed";
  } catch {
    console.error("Enterprise WeChat case notification failed");
    return "failed";
  }
}
