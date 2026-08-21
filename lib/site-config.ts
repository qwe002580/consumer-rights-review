export const consultationLabel = "复制案情并咨询客服";

export function getConsultationUrl() {
  return process.env.NEXT_PUBLIC_CONSULTATION_URL?.trim() ?? "";
}

export function getCustomerServiceWechat() {
  return process.env.CUSTOMER_SERVICE_WECHAT?.trim() ?? "";
}
