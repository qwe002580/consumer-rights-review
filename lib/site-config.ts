export const consultationLabel = "添加企业微信，免费复核";

export function getConsultationUrl() {
  return process.env.NEXT_PUBLIC_CONSULTATION_URL?.trim() ?? "";
}

export function getCustomerServiceWechat() {
  return process.env.CUSTOMER_SERVICE_WECHAT?.trim() ?? "";
}
