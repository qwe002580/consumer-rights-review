export const consultationLabel = "添加微信领取清单";

export function getConsultationUrl() {
  return process.env.NEXT_PUBLIC_CONSULTATION_URL?.trim() ?? "";
}
