import {
  getContactTimeLabel,
  getGoalLabel,
  getPaymentMethodLabel,
  getReceiveMethodLabel,
  getReviewFlagLabel,
  getScenarioLabel,
  getStageLabel,
  getSupplementWillingnessLabel,
  issueLabels,
  evidenceLabels,
  obstacleLabels,
  type IntakeInput,
  type PublicAnalysis
} from "./schema";

export type CustomerServiceMessageInput = {
  assessmentNo?: string;
  caseId?: string;
  leadScore?: string;
  intake?: IntakeInput;
  result?: PublicAnalysis | null;
  scenario: string;
  goal: string;
};

const opportunityLabels: Record<PublicAnalysis["opportunity"], string> = {
  high: "较高",
  medium_high: "中高",
  medium: "中等",
  low: "偏低",
  unclear: "待核验"
};

const evidenceCompletenessLabels: Record<PublicAnalysis["evidenceCompleteness"], string> = {
  complete: "较完整",
  partial: "部分完整",
  insufficient: "不足",
  review_needed: "需要复核"
};

function list(values: string[] | undefined, labels?: Readonly<Record<string, string>>) {
  if (!values?.length) return "- 未填写";
  return values.map((value) => `- ${labels?.[value] ?? value}`).join("\n");
}

function valueOrFallback(value: string | number | undefined | null, fallback = "未填写") {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function amountLabel(amount: number | undefined) {
  if (!amount) return "未填写";
  return `¥${new Intl.NumberFormat("zh-CN").format(amount)}`;
}

function section(title: string, lines: string[]) {
  return [title, ...lines].join("\n");
}

export function buildCustomerServiceMessage(input: CustomerServiceMessageInput) {
  const intake = input.intake;
  const result = input.result;

  return [
    "【退款自测案情】",
    section("一、识别信息", [
      `评估编号：${valueOrFallback(input.assessmentNo, "未生成")}`,
      `案件编号：${valueOrFallback(input.caseId, "未生成")}`,
      `线索等级：${valueOrFallback(input.leadScore, "未标记")}`,
      `复核建议：${getReviewFlagLabel(result?.review_flag)}`
    ]),
    section("二、客户联系方式", [
      `客户称呼：${valueOrFallback(intake?.clientName)}`,
      `接收方式：${intake ? getReceiveMethodLabel(intake.receiveMethod) : "未填写"}`,
      `联系方式：${valueOrFallback(intake?.contact)}`,
      `微信号：${valueOrFallback(intake?.wechatId)}`,
      `手机号：${valueOrFallback(intake?.phone)}`,
      `方便沟通时间：${getContactTimeLabel(intake?.contactTime ?? "")}`,
      `补充材料意愿：${getSupplementWillingnessLabel(intake?.willingToSupplement ?? "unknown")}`
    ]),
    section("三、交易与诉求", [
      `纠纷类型：${getScenarioLabel(intake?.scenario ?? input.scenario)}`,
      `支付金额：${amountLabel(intake?.amount)}`,
      `付款时间：${valueOrFallback(intake?.purchaseDate)}`,
      `付款方式：${intake ? getPaymentMethodLabel(intake.paymentMethod) : "未填写"}`,
      `目标诉求：${getGoalLabel(intake?.goal ?? input.goal)}`,
      `商家/机构：${valueOrFallback(intake?.merchantName)}`,
      `商家承诺：${valueOrFallback(intake?.merchantPromise)}`,
      `协议/服务说明：${valueOrFallback(intake?.agreementStatus)}`,
      `分期/贷款状态：${valueOrFallback(intake?.installmentStatus)}`,
      `平台处理结果：${valueOrFallback(intake?.platformResult)}`
    ]),
    section("四、客户提交情况", [
      `当前进度：${intake ? getStageLabel(intake.stage) : "未填写"}`,
      `补充说明：${valueOrFallback(intake?.summary)}`,
      "核心争议：",
      list(intake?.issues, issueLabels),
      "已有材料：",
      list(intake?.evidence, evidenceLabels),
      "当前障碍：",
      list(intake?.obstacles, obstacleLabels),
      `最缺材料：${valueOrFallback(intake?.missingEvidenceType)}`
    ]),
    section("五、页面初步评估", [
      `处理机会：${result ? opportunityLabels[result.opportunity] : "未生成"}`,
      `证据完整度：${result ? evidenceCompletenessLabels[result.evidenceCompleteness] : "未生成"}`,
      `核心判断：${valueOrFallback(result?.summary, "未生成")}`,
      "主要风险：",
      list(result?.riskPoints),
      "材料缺口：",
      list(result?.materialGaps)
    ]),
    "请客服根据评估编号调取后台案件，并结合完整材料做人工复核。"
  ].join("\n\n");
}
