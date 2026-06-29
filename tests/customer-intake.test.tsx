import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildIntakePayload,
  getReceiveFieldVisibility,
  IntakeForm
} from "../components/intake-form";

const applicableSituations = [
  "商家拒绝退款",
  "培训机构退费难",
  "医美项目做了一半想退款",
  "直播间/电商售后纠纷",
  "健身卡、摄影、婚庆服务退款",
  "付款后服务未履行"
];

describe("customer refund intake", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("explains the refund self-check and who it is for", () => {
    const html = renderToStaticMarkup(<IntakeForm />);

    expect(html).toContain("先判断能不能退，再决定怎么处理");
    expect(html).toContain("开始免费案情初筛");
    expect(html).toContain("很多退款纠纷不是不能处理，而是材料顺序和沟通节点没抓准。");
    expect(html).toContain("为什么自己投诉后还是没结果");
    expect(html).toContain("我们会先做初步筛查");
    applicableSituations.forEach((situation) => expect(html).toContain(situation));
  });

  it("asks for dispute facts before result receiving details", () => {
    const html = renderToStaticMarkup(<IntakeForm />);
    const scenarioIndex = html.indexOf("纠纷类型");
    const merchantIndex = html.indexOf("商家或机构名称");
    const receiveIndex = html.indexOf("接收你的免费评估结果");
    const nameIndex = html.indexOf("您的称呼");
    const receiveChoiceIndex = html.indexOf("选择接收方式");

    expect(scenarioIndex).toBeGreaterThan(-1);
    expect(merchantIndex).toBeGreaterThan(scenarioIndex);
    expect(receiveIndex).toBeGreaterThan(merchantIndex);
    expect(nameIndex).toBeGreaterThan(receiveIndex);
    expect(receiveChoiceIndex).toBeGreaterThan(nameIndex);
    expect(scenarioIndex).toBeLessThan(nameIndex);
    expect(html).not.toContain("对方联系方式");
    expect(html).not.toContain("Case Review");
    expect(html).toContain("生成我的免费评估结果");
  });

  it("defines conditional result receiving fields", () => {
    expect(getReceiveFieldVisibility("wechat")).toEqual({
      wechat: true,
      phone: false,
      contactTime: false
    });
    expect(getReceiveFieldVisibility("sms")).toEqual({
      wechat: false,
      phone: true,
      contactTime: false
    });
    expect(getReceiveFieldVisibility("phone")).toEqual({
      wechat: false,
      phone: true,
      contactTime: true
    });
    expect(getReceiveFieldVisibility("page")).toEqual({
      wechat: false,
      phone: false,
      contactTime: false
    });
  });

  it("clears hidden conditional fields before submission", () => {
    const payload = buildIntakePayload({
      clientName: "测试客户",
      contact: "stale-contact",
      scenario: "ecommerce",
      amount: "3800",
      purchaseDate: "2026-06-01",
      paymentMethod: "full",
      stage: "none",
      issues: ["refuse_refund"],
      evidence: ["payment"],
      obstacles: [],
      goal: "full_refund",
      summary: "商家拒绝退款，希望先判断材料缺口。",
      agreementStatus: "旧协议信息",
      installmentStatus: "旧分期信息",
      platformResult: "旧平台结果",
      missingEvidenceType: "旧缺失材料",
      merchantName: "某电商店铺",
      merchantPromise: "承诺七天无理由退款",
      receiveMethod: "page",
      wechatId: "wx-stale",
      phone: "13800138000",
      contactTime: "evening",
      willingToSupplement: "unknown"
    });

    expect(payload).toEqual(
      expect.objectContaining({
        amount: 3800,
        contact: "",
        wechatId: "",
        phone: "",
        contactTime: "",
        agreementStatus: "",
        installmentStatus: "",
        platformResult: "",
        missingEvidenceType: ""
      })
    );
  });

  it("shows the full legal disclaimer", () => {
    const html = renderToStaticMarkup(<IntakeForm />);

    expect(html).toContain(
      "本工具仅基于用户填写信息生成初步参考，不构成正式法律意见或结果承诺。具体处理方式需结合完整证据材料进一步判断。"
    );
  });

  it("defines dedicated responsive styles for the new customer sections", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain(".applicability-grid");
    expect(css).toContain(".trust-module-grid");
    expect(css).toContain(".receive-method-grid");
    expect(css).toContain(".lead-capture-section");
    expect(css).toContain(".legal-disclaimer");
  });
});
