import { describe, expect, it } from "vitest";

describe("POST /api/analyze", () => {
  it("rejects incomplete intake payloads", async () => {
    const { POST } = await import("../app/api/analyze/route");
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ clientName: "" }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
