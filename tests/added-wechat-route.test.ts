import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    case: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany
    }
  }
}));

import { POST } from "../app/api/cases/[id]/added-wechat/route";

function request(body: unknown) {
  return new Request("http://localhost/api/cases/case_123/added-wechat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function rawRequest(body: string) {
  return new Request("http://localhost/api/cases/case_123/added-wechat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body
  });
}

const context = { params: Promise.resolve({ id: "case_123" }) };

describe("POST /api/cases/[id]/added-wechat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.findUnique.mockResolvedValue({
      id: "case_123",
      assessmentNo: "11399-20260629-0081",
      addedWechat: false
    });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("marks the case as added without returning case data", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T10:00:00.000Z"));

    const response = await POST(
      request({ assessmentNo: "11399-20260629-0081" }),
      context
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ addedWechat: true });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "case_123",
        assessmentNo: "11399-20260629-0081",
        addedWechat: false
      },
      data: {
        addedWechat: true,
        addedWechatAt: new Date("2026-06-29T10:00:00.000Z")
      }
    });
    expect(JSON.stringify(body)).not.toContain("11399-20260629-0081");
  });

  it("is idempotent after the first added-wechat transition", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "case_123",
      assessmentNo: "11399-20260629-0081",
      addedWechat: true
    });

    const response = await POST(
      request({ assessmentNo: "11399-20260629-0081" }),
      context
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ addedWechat: true });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects mismatched assessment numbers", async () => {
    const response = await POST(request({ assessmentNo: "wrong" }), context);

    expect(response.status).toBe(404);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and missing assessment numbers", async () => {
    const malformed = await POST(rawRequest("{not-json"), context);
    const missing = await POST(request({}), context);

    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toEqual({ error: "INVALID_JSON" });
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toEqual({ error: "INVALID_ASSESSMENT" });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the case does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST(
      request({ assessmentNo: "11399-20260629-0081" }),
      context
    );

    expect(response.status).toBe(404);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns a generic error when persistence fails", async () => {
    mocks.findUnique.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      request({ assessmentNo: "11399-20260629-0081" }),
      context
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "ADDED_WECHAT_UPDATE_FAILED",
      details: "暂时无法记录添加状态，请稍后重试。"
    });
    expect(JSON.stringify(body)).not.toContain("database unavailable");
  });
});
