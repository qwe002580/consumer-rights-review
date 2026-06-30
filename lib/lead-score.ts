import {
  getShanghaiCalendarDate,
  parseValidPurchaseDate,
  type CalendarDate,
  type IntakeInput
} from "./schema";

export type LeadScore = {
  points: number;
  grade: "A" | "B" | "C";
  reasons: string[];
};

function dateKey(date: CalendarDate) {
  return date.year * 10000 + date.month * 100 + date.day;
}

function purchaseAgeBand(purchaseDate: string, now: Date) {
  const purchase = parseValidPurchaseDate(purchaseDate, now);
  if (!purchase) return "older";

  const currentKey = dateKey(getShanghaiCalendarDate(now));
  const anniversaryKey = (years: number) => {
    const year = purchase.year + years;
    const lastDayOfMonth = new Date(Date.UTC(year, purchase.month, 0)).getUTCDate();
    return dateKey({ ...purchase, year, day: Math.min(purchase.day, lastDayOfMonth) });
  };

  if (currentKey <= anniversaryKey(2)) return "two_years";
  if (currentKey <= anniversaryKey(3)) return "three_years";
  return "older";
}

function normalized(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase().replaceAll("_", "")));
}

export function calculateLeadScore(intake: IntakeInput, now = new Date()): LeadScore {
  let points = 0;
  const reasons: string[] = [];
  const add = (value: number, reason: string) => {
    points += value;
    reasons.push(`${reason} ${value > 0 ? "+" : ""}${value}`);
  };

  if (intake.amount >= 3000) add(2, "争议金额较高");
  else if (intake.amount >= 1000) add(1, "争议金额达到一定规模");

  const purchaseAge = purchaseAgeBand(intake.purchaseDate, now);
  if (purchaseAge === "two_years") add(2, "购买时间在两年内");
  else if (purchaseAge === "three_years") add(1, "购买时间在三年内");

  const evidence = normalized(intake.evidence);
  if (evidence.has("payment")) add(2, "有付款凭证");
  if (["chat", "contract", "invoice"].some((item) => evidence.has(item))) {
    add(2, "有关键辅助材料");
  }

  const issues = normalized(intake.issues);
  const obstacles = normalized(intake.obstacles);
  if (
    ["refuserefund", "nonperformance"].some((item) => issues.has(item)) ||
    ["merchantdelay", "merchantoffline"].some((item) => obstacles.has(item))
  ) {
    add(2, "存在明显履约或退款障碍");
  }

  if (["wechat", "sms", "phone"].includes(intake.receiveMethod)) add(1, "愿意接受联系");
  if (intake.willingToSupplement === "yes") add(1, "愿意补充材料");

  const goal = intake.goal.toLowerCase().replaceAll("_", "");
  if (["refund", "cancel", "terminate"].some((keyword) => goal.includes(keyword))) {
    add(1, "诉求明确");
  }

  if (
    intake.merchantName.trim() &&
    intake.merchantPromise.trim() &&
    intake.merchantPromise.trim() !== "不清楚"
  ) {
    add(1, "商家信息较完整");
  }

  if (intake.receiveMethod === "page") add(-1, "仅选择页面接收");
  if (intake.summary.trim().length < 20 && intake.evidence.length < 2) {
    add(-1, "案情描述和材料较少");
  }

  return { points, grade: points >= 8 ? "A" : points >= 4 ? "B" : "C", reasons };
}
