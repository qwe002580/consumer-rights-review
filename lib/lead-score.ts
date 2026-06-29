import type { IntakeInput } from "./schema";

export type LeadScore = {
  points: number;
  grade: "A" | "B" | "C";
  reasons: string[];
};

function shanghaiDate(date: Date) {
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

function purchaseAgeBand(purchaseDate: string, now: Date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(purchaseDate);
  if (!match) return "older";

  const current = shanghaiDate(now);
  const purchase = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const currentKey = current.year * 10000 + current.month * 100 + current.day;
  const anniversaryKey = (years: number) =>
    (purchase.year + years) * 10000 + purchase.month * 100 + purchase.day;

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

  if (intake.receiveMethod === "page" && !intake.contact.trim()) add(-1, "仅查看页面且未留联系方式");
  if (intake.summary.trim().length < 20 && intake.evidence.length < 2) {
    add(-1, "案情描述和材料较少");
  }

  return { points, grade: points >= 8 ? "A" : points >= 4 ? "B" : "C", reasons };
}
