import { z } from "zod";

export type CalendarDate = { year: number; month: number; day: number };

export function getShanghaiCalendarDate(date: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
}

export function parseValidPurchaseDate(value: string, now = new Date()): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const purchase = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const utcDate = new Date(0);
  utcDate.setUTCHours(0, 0, 0, 0);
  utcDate.setUTCFullYear(purchase.year, purchase.month - 1, purchase.day);
  if (
    utcDate.getUTCFullYear() !== purchase.year ||
    utcDate.getUTCMonth() + 1 !== purchase.month ||
    utcDate.getUTCDate() !== purchase.day
  ) {
    return null;
  }

  const current = getShanghaiCalendarDate(now);
  const dateKey = (date: CalendarDate) => date.year * 10000 + date.month * 100 + date.day;
  return dateKey(purchase) <= dateKey(current) ? purchase : null;
}

export const scenarioLabels = {
  education: "教培退费",
  medical_beauty: "医美纠纷",
  ecommerce: "电商售后",
  live_stream: "直播间消费",
  gaming: "游戏充值",
  food_delivery: "外卖餐饮",
  logistics: "快递物流",
  travel: "票务/旅游退款",
  home_services: "家政/维修服务",
  rental: "租房/公寓纠纷",
  fitness: "健身/摄影/婚庆服务",
  telecom: "话费/宽带/运营商",
  digital_service: "会员订阅/数字服务",
  used_goods: "二手交易",
  auto_service: "买车/修车/养车服务",
  pet_service: "宠物购买/医疗/寄养",
  local_service: "到店消费/美容美发/洗浴",
  other: "其他消费服务"
} as const;

export const paymentMethodLabels = {
  full: "一次性付款",
  deposit: "定金/预付款",
  installment: "分期/贷款"
} as const;

export const stageLabels = {
  none: "尚未正式沟通",
  negotiating: "已与商家沟通",
  platform: "已向平台投诉",
  deadlock: "多轮沟通后仍无进展"
} as const;

export const issueLabels = {
  misrepresentation: "宣传或承诺不符",
  nonperformance: "服务未履行或未完成",
  quality: "商品或服务质量问题",
  refuse_refund: "商家拒绝退款",
  extra_charge: "存在不合理扣费",
  coercion: "诱导消费或强迫签约"
} as const;

export const evidenceLabels = {
  payment: "付款记录",
  contract: "合同/协议/知情同意",
  chat: "聊天记录",
  promo: "宣传页面或承诺截图",
  invoice: "发票/收据/订单信息",
  recording: "录音录像/现场照片"
} as const;

export const obstacleLabels = {
  missing_evidence: "关键材料不完整",
  missingEvidence: "关键材料不完整",
  merchant_delay: "商家持续拖延",
  merchantDelay: "商家持续拖延",
  merchant_offline: "商家失联或拒绝回应",
  merchantOffline: "商家失联或拒绝回应",
  platform_rejected: "平台已驳回或处理不充分",
  platformRejected: "平台已驳回或处理不充分"
} as const;

export const goalLabels = {
  full_refund: "全额退款",
  fullRefund: "全额退款",
  partial_refund: "部分退款",
  partialRefund: "部分退款",
  cancel_installment: "解除分期或贷款",
  cancelInstallment: "解除分期或贷款",
  compensation: "赔偿损失",
  terminate_service: "解除合同或终止服务",
  terminateService: "解除合同或终止服务"
} as const;

export const reviewFlagLabels = {
  self_service: "适合继续自助处理",
  manual_review: "建议人工复核",
  contact_soon: "建议尽快联系",
  complex_high_risk: "高风险复杂案件"
} as const;

export const caseStatusLabels = {
  new: "新提交",
  reviewed: "已复核",
  contacted: "已联系",
  on_hold: "暂缓处理",
  closed: "已关闭"
} as const;

export const intakeSchema = z.object({
  clientName: z.string().min(1),
  contact: z.string().default(""),
  scenario: z.string().min(1),
  amount: z.number().int().positive(),
  purchaseDate: z.string().superRefine((value, ctx) => {
    if (!parseValidPurchaseDate(value)) {
      ctx.addIssue({ code: "custom", message: "请输入有效且不晚于今天的购买日期" });
    }
  }),
  paymentMethod: z.string().min(1),
  stage: z.string().min(1),
  issues: z.array(z.string()).min(1),
  evidence: z.array(z.string()).min(1),
  obstacles: z.array(z.string()),
  goal: z.string().min(1),
  summary: z.string().default(""),
  agreementStatus: z.string().optional(),
  installmentStatus: z.string().optional(),
  platformResult: z.string().optional(),
  missingEvidenceType: z.string().optional(),
  merchantName: z.string().trim().min(1),
  merchantPromise: z.string().trim().min(1),
  receiveMethod: z.enum(["wechat", "sms", "phone", "page"]),
  wechatId: z.string().default(""),
  phone: z.string().trim().default(""),
  contactTime: z.union([
    z.enum(["now", "30m", "afternoon", "evening", "tomorrow"]),
    z.literal("")
  ]).default(""),
  willingToSupplement: z.enum(["yes", "not_now", "unknown"])
}).superRefine((value, ctx) => {
  if (value.receiveMethod === "wechat" && !value.wechatId.trim()) {
    ctx.addIssue({ code: "custom", path: ["wechatId"], message: "请输入微信号" });
  }
  if (["sms", "phone"].includes(value.receiveMethod) && !/^1\d{10}$/.test(value.phone)) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "请输入有效手机号" });
  }
  if (
    value.receiveMethod === "phone" &&
    !["now", "30m", "afternoon", "evening", "tomorrow"].includes(value.contactTime)
  ) {
    ctx.addIssue({ code: "custom", path: ["contactTime"], message: "请选择方便沟通时间" });
  }
});

export const probabilityRangeSchema = z.object({
  min: z.number().int().min(0).max(95),
  max: z.number().int().min(0).max(95)
});

export const probabilityAssessmentSchema = z.object({
  full_success: probabilityRangeSchema,
  substantive_result: probabilityRangeSchema,
  confidence: z.enum(["limited", "moderate", "strong"]),
  factors: z.array(z.string())
});

export type ProbabilityAssessment = z.infer<typeof probabilityAssessmentSchema>;

export const legacyAnalysisOutputSchema = z.object({
  summary: z.string().min(1),
  basis: z.array(z.string()).min(1),
  risks: z.array(z.string()).min(1),
  next_steps: z.array(z.string()).min(1),
  materials: z.array(z.string()).min(1),
  communication: z.string().min(1),
  review_flag: z.enum([
    "self_service",
    "manual_review",
    "contact_soon",
    "complex_high_risk"
  ])
});

export const modelAnalysisSchema = z.object({
  summary: z.string().min(1),
  opportunity: z.enum(["high", "medium_high", "medium", "low", "unclear"]),
  evidence_completeness: z.enum(["complete", "partial", "insufficient", "review_needed"]),
  favorable_factors: z.array(z.string()).min(1),
  adverse_factors: z.array(z.string()).min(1),
  decisive_issues: z.array(z.string()).min(1),
  materials: z.array(z.string()).min(1),
  strategy_direction: z.string().min(1),
  review_flag: z.enum([
    "self_service",
    "manual_review",
    "contact_soon",
    "complex_high_risk"
  ])
});

export const analysisOutputSchema = modelAnalysisSchema;

export const publicAnalysisSchema = z.object({
  summary: z.string().min(1),
  opportunity: modelAnalysisSchema.shape.opportunity,
  evidenceCompleteness: z.enum(["complete", "partial", "insufficient", "review_needed"]),
  riskPoints: z.array(z.string()).max(4),
  materialGaps: z.array(z.string()).max(4),
  manualReviewRecommended: z.boolean(),
  review_flag: modelAnalysisSchema.shape.review_flag
});

export type IntakeInput = z.infer<typeof intakeSchema>;
export type ModelAnalysis = z.infer<typeof modelAnalysisSchema>;
export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
export type LegacyAnalysisOutput = z.infer<typeof legacyAnalysisOutputSchema>;
export type PublicAnalysis = z.infer<typeof publicAnalysisSchema>;

export type StoredAnalysisDisplay = {
  summary: string;
  favorable_factors: string[];
  adverse_factors: string[];
  decisive_issues: string[];
  strategy: string;
  next_steps: string[];
  public_stage_titles: string[];
  materials: string[];
  communication: string;
  review_flag: ModelAnalysis["review_flag"];
  probability: ProbabilityAssessment | null;
};

const priorAnalysisOutputSchema = z.object({
  summary: z.string().min(1),
  favorable_factors: z.array(z.string()),
  adverse_factors: z.array(z.string()),
  decisive_issues: z.array(z.string()),
  strategy: z.string(),
  next_steps: z.array(z.string()),
  public_stage_titles: z.array(z.string()),
  materials: z.array(z.string()),
  communication: z.string(),
  review_flag: modelAnalysisSchema.shape.review_flag,
  probability: probabilityAssessmentSchema.optional()
});

export function normalizeStoredAnalysis(value: unknown): StoredAnalysisDisplay | null {
  const current = modelAnalysisSchema.safeParse(value);
  if (current.success) {
    return {
      summary: current.data.summary,
      favorable_factors: current.data.favorable_factors,
      adverse_factors: current.data.adverse_factors,
      decisive_issues: current.data.decisive_issues,
      strategy: current.data.strategy_direction,
      next_steps: [],
      public_stage_titles: [],
      materials: current.data.materials,
      communication: "新案件仅生成诊断，不生成沟通话术。",
      review_flag: current.data.review_flag,
      probability: null
    };
  }

  const prior = priorAnalysisOutputSchema.safeParse(value);
  if (prior.success) return { ...prior.data, probability: prior.data.probability ?? null };

  const legacy = legacyAnalysisOutputSchema.safeParse(value);
  if (!legacy.success) return null;

  return {
    summary: legacy.data.summary,
    favorable_factors: legacy.data.basis,
    adverse_factors: legacy.data.risks,
    decisive_issues: [],
    strategy: "旧案件未生成完整处理策略。",
    next_steps: legacy.data.next_steps,
    public_stage_titles: [],
    materials: legacy.data.materials,
    communication: legacy.data.communication,
    review_flag: legacy.data.review_flag,
    probability: null
  };
}

export const caseUpdateSchema = z.object({
  status: z.enum(["new", "reviewed", "contacted", "on_hold", "closed"]),
  operatorNotes: z.string().default("")
});

export type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;

function mapArrayLabels(values: string[], labels: Record<string, string>) {
  return values.map((value) => labels[value] ?? value);
}

export function getScenarioLabel(value: string) {
  return scenarioLabels[value as keyof typeof scenarioLabels] ?? value;
}

export function getPaymentMethodLabel(value: string) {
  return paymentMethodLabels[value as keyof typeof paymentMethodLabels] ?? value;
}

export function getStageLabel(value: string) {
  return stageLabels[value as keyof typeof stageLabels] ?? value;
}

export function getGoalLabel(value: string) {
  return goalLabels[value as keyof typeof goalLabels] ?? value;
}

export function getReviewFlagLabel(value: string | null | undefined) {
  if (!value) return "未标记";
  return reviewFlagLabels[value as keyof typeof reviewFlagLabels] ?? value;
}

export function getCaseStatusLabel(value: string) {
  return caseStatusLabels[value as keyof typeof caseStatusLabels] ?? value;
}

export function normalizeIntakeForDisplay(intake: IntakeInput) {
  return {
    ...intake,
    scenario: getScenarioLabel(intake.scenario),
    paymentMethod: getPaymentMethodLabel(intake.paymentMethod),
    stage: getStageLabel(intake.stage),
    goal: getGoalLabel(intake.goal),
    issues: mapArrayLabels(intake.issues, issueLabels),
    evidence: mapArrayLabels(intake.evidence, evidenceLabels),
    obstacles: mapArrayLabels(intake.obstacles, obstacleLabels)
  };
}
