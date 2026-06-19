export const consultationLabel = "添加老师继续咨询";

export function getConsultationUrl() {
  return process.env.NEXT_PUBLIC_CONSULTATION_URL?.trim() ?? "";
}
