import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    case: {
      findUnique: mocks.findUnique,
      update: mocks.update
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
    mocks.update.mockResolvedValue({
      id: "case_123",
      addedWechat: true
    });
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
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "case_123" },
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
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects mismatched assessment numbers", async () => {
    const response = await POST(request({ assessmentNo: "wrong" }), context);

    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
