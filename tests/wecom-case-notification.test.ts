import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildNewCaseNotification,
  sendNewCaseNotification
} from "../lib/wecom-case-notification";

const caseSummary = {
  id: "case_123",
  assessmentNo: "11399-20260621-0001",
  leadScore: "A",
  receiveMethod: "wechat",
  scenario: "education",
  amount: 6800,
  stage: "deadlock",
  reviewFlag: "contact_soon",
  createdAt: new Date("2026-06-21T08:00:00.000Z"),
  siteUrl: "https://consumer-rights-review.zeabur.app"
};

describe("Enterprise WeChat case notifications", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("builds a concise case notification with a backend link", () => {
    const message = buildNewCaseNotification(caseSummary);

    expect(message).toContain("新退款纠纷案件");
    expect(message).toContain("评估编号：11399-20260621-0001");
    expect(message).toContain("线索等级：A");
    expect(message).toContain("接收方式：微信");
    expect(message).toContain("教培退费");
    expect(message).toContain("¥6,800");
    expect(message).toContain("建议尽快联系");
    expect(message).toContain(
      "https://consumer-rights-review.zeabur.app/cases/case_123"
    );
  });

  it("has no API for passing customer names or contact details", () => {
    const message = buildNewCaseNotification(caseSummary);

    expect(message).not.toContain("客户姓名");
    expect(message).not.toContain("联系方式");
    expect(message).not.toContain("手机号");
    expect(message).not.toContain("微信号");
    expect(message).not.toContain("wx-secret");
    expect(message).not.toContain("13800138000");
    expect(message).not.toContain("承诺可全额退款");
    expect(message).not.toContain("用户叙述了完整详细案情");
    expect(message).not.toContain("完整分析总结");
  });

  it("skips delivery when no webhook is configured", async () => {
    vi.stubEnv("WECOM_CASE_WEBHOOK_URL", "");
    const fetchMock = vi.fn();

    await expect(
      sendNewCaseNotification(caseSummary, fetchMock)
    ).resolves.toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends an Enterprise WeChat markdown payload", async () => {
    vi.stubEnv(
      "WECOM_CASE_WEBHOOK_URL",
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key"
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await expect(
      sendNewCaseNotification(caseSummary, fetchMock)
    ).resolves.toBe("sent");
    expect(fetchMock).toHaveBeenCalledWith(
      process.env.WECOM_CASE_WEBHOOK_URL,
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"msgtype":"markdown"')
      })
    );
  });

  it("returns failed instead of throwing on network errors", async () => {
    vi.stubEnv(
      "WECOM_CASE_WEBHOOK_URL",
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key"
    );
    const fetchMock = vi.fn().mockRejectedValue(new Error("network unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendNewCaseNotification(caseSummary, fetchMock)
    ).resolves.toBe("failed");
  });
});
