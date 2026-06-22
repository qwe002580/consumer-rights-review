import {
  getCaseStatusLabel,
  getGoalLabel,
  getPaymentMethodLabel,
  getReviewFlagLabel,
  getScenarioLabel,
  getStageLabel,
  intakeSchema,
  normalizeIntakeForDisplay,
  normalizeStoredAnalysis
} from "./schema";

export type InternalCaseSummaryInput = {
  id: string;
  createdAt: string;
  status: string;
  clientName: string;
  contact: string;
  scenario: string;
  amount: number;
  operatorNotes: string;
  intake: unknown;
  analysis: unknown;
};

function bullets(items: string[], fallback = "- 未填写") {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : fallback;
}

function numbered(items: string[]) {
  return items.length
    ? items.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "1. 未生成处理步骤";
}

function section(title: string, content: string[]) {
  return [title, ...content].join("\n");
}

function rangeLabel(range: { min: number; max: number } | undefined) {
  return range ? `${range.min}%–${range.max}%` : "尚未评估";
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai"
  }).format(date);
}

export function buildInternalCaseSummary(input: InternalCaseSummaryInput) {
  const parsedIntake = intakeSchema.safeParse(input.intake);
  const intake = parsedIntake.success
    ? normalizeIntakeForDisplay(parsedIntake.data)
    : null;
  const analysis = normalizeStoredAnalysis(input.analysis);
  const probability = analysis?.probability;

  return [
    "【内部案件摘要】",
    section("一、案件概览", [
      `案件编号：${input.id}`,
      `提交时间：${formatCreatedAt(input.createdAt)}`,
      `状态：${getCaseStatusLabel(input.status)}`,
      `优先级：${getReviewFlagLabel(analysis?.review_flag)}`
    ]),
    section("二、客户与交易", [
      `客户称呼：${input.clientName}`,
      `联系方式：${input.contact}`,
      `纠纷类型：${getScenarioLabel(input.scenario)}`,
      `支付金额：¥${new Intl.NumberFormat("zh-CN").format(input.amount)}`,
      `付款时间：${intake?.purchaseDate ?? "未填写"}`,
      `付款方式：${intake ? getPaymentMethodLabel(intake.paymentMethod) : "未填写"}`,
      `目标诉求：${intake ? getGoalLabel(intake.goal) : "未填写"}`
    ]),
    section("三、客户提交情况", [
      `当前进度：${intake ? getStageLabel(intake.stage) : "未填写"}`,
      `情况概述：${intake?.summary || "未填写"}`,
      "核心争议：",
      bullets(intake?.issues ?? []),
      "已有材料：",
      bullets(intake?.evidence ?? []),
      "当前障碍：",
      bullets(intake?.obstacles ?? [])
    ]),
    section("四、概率评估", [
      `达成全部诉求概率：${rangeLabel(probability?.full_success)}`,
      `取得实质处理结果概率：${rangeLabel(probability?.substantive_result)}`,
      "主要评分因素：",
      bullets(probability?.factors ?? [])
    ]),
    section("五、完整分析", [
      `初步判断：${analysis?.summary ?? "未生成"}`,
      "有利因素：",
      bullets(analysis?.favorable_factors ?? []),
      "不利因素：",
      bullets(analysis?.adverse_factors ?? []),
      "决定性问题：",
      bullets(analysis?.decisive_issues ?? []),
      `完整处理策略：${analysis?.strategy ?? "未生成"}`
    ]),
    section("六、处理步骤与材料", [
      "处理步骤：",
      numbered(analysis?.next_steps ?? []),
      "建议补充材料：",
      bullets(analysis?.materials ?? [])
    ]),
    section("七、沟通与备注", [
      `沟通建议：${analysis?.communication ?? "未生成"}`,
      `后台备注：${input.operatorNotes || "无"}`
    ])
  ].join("\n\n");
}
