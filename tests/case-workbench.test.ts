import { describe, expect, it } from "vitest";
import { filterAndSortCases } from "../components/case-table";

const baseCase = {
  id: "case-1",
  clientName: "张女士",
  contact: "13800000000",
  scenario: "ecommerce",
  amount: 3999,
  status: "new",
  reviewFlag: "self_service",
  createdAt: new Date("2026-06-18T08:00:00.000Z"),
  analysis: { summary: "普通售后纠纷" }
};

describe("case workbench", () => {
  it("places urgent cases before self-service cases", () => {
    const urgent = {
      ...baseCase,
      id: "urgent",
      reviewFlag: "complex_high_risk",
      createdAt: new Date("2026-06-17T08:00:00.000Z")
    };

    const result = filterAndSortCases([baseCase, urgent], "all", "all");

    expect(result.map((item) => item.id)).toEqual(["urgent", "case-1"]);
  });

  it("filters cases by status and review priority", () => {
    const reviewed = {
      ...baseCase,
      id: "reviewed",
      status: "reviewed",
      reviewFlag: "manual_review"
    };

    const result = filterAndSortCases(
      [baseCase, reviewed],
      "manual_review",
      "reviewed"
    );

    expect(result.map((item) => item.id)).toEqual(["reviewed"]);
  });
});
