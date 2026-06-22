export const consultationLabel = "添加顾问继续评估";

export function getConsultationUrl() {
  return process.env.NEXT_PUBLIC_CONSULTATION_URL?.trim() ?? "";
}
