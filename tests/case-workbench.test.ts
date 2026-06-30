import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { filterAndSortCases } from "../components/case-table";

const baseCase = {
  id: "case-1",
  assessmentNo: "11399-20260618-0001",
  clientName: "张女士",
  contact: "13800000000",
  receiveMethod: "phone",
  leadScore: "C",
  addedWechat: false,
  scenario: "ecommerce",
  amount: 3999,
  status: "uncontacted",
  reviewFlag: "self_service",
  createdAt: new Date("2026-06-18T08:00:00.000Z"),
  analysis: { summary: "普通售后纠纷" }
};

describe("case workbench", () => {
  it("labels stored contact data as the customer contact", () => {
    const source = readFileSync("components/case-table.tsx", "utf8");

    expect(source).toContain("客户联系方式：");
  });

  it("prioritizes lead grade before recency", () => {
    const aOld = {
      ...baseCase,
      id: "a-old",
      leadScore: "A",
      createdAt: new Date("2026-06-17T08:00:00.000Z")
    };
    const aNew = {
      ...baseCase,
      id: "a-new",
      leadScore: "A",
      createdAt: new Date("2026-06-19T08:00:00.000Z")
    };
    const bCase = { ...baseCase, id: "b", leadScore: "B" };
    const cCase = { ...baseCase, id: "c", leadScore: "C" };

    const result = filterAndSortCases([cCase, aOld, aNew, bCase], "all", "all");

    expect(result.map((item) => item.id)).toEqual(["a-new", "a-old", "b", "c"]);
  });

  it("filters cases by status and lead grade", () => {
    const strongInterest = {
      ...baseCase,
      id: "strong-interest",
      status: "strong_interest",
      leadScore: "A"
    };

    const result = filterAndSortCases(
      [baseCase, strongInterest],
      "A",
      "strong_interest"
    );

    expect(result.map((item) => item.id)).toEqual(["strong-interest"]);
  });

  it("includes legacy statuses in their equivalent follow-up filters", () => {
    const legacyNew = { ...baseCase, id: "legacy-new", status: "new" };
    const legacyContacted = { ...baseCase, id: "legacy-contacted", status: "contacted" };

    expect(filterAndSortCases([legacyNew, legacyContacted], "all", "uncontacted"))
      .toHaveLength(1);
    expect(filterAndSortCases([legacyNew, legacyContacted], "all", "communicated"))
      .toHaveLength(1);
  });

  it("renders assessment, receive method, lead grade, and added state labels", () => {
    const source = readFileSync("components/case-table.tsx", "utf8");

    expect(source).toContain("评估编号");
    expect(source).toContain("线索等级");
    expect(source).toContain("接收方式");
    expect(source).toContain("已点击企微");
  });
});
