import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntakeForm } from "../components/intake-form";

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

    expect(html).toContain("退款纠纷自测");
    expect(html).toContain("3分钟判断你的钱还能不能退");
    expect(html).toContain("填写付款、沟通、材料情况，生成初步处理建议和补充材料清单。");
    applicableSituations.forEach((situation) => expect(html).toContain(situation));
  });

  it("asks for dispute facts before required customer contact details", () => {
    const html = renderToStaticMarkup(<IntakeForm />);
    const scenarioIndex = html.indexOf("纠纷类型");
    const nameIndex = html.indexOf("您的称呼");
    const contactIndex = html.indexOf("您的联系方式");
    const contactMarkup = html.slice(contactIndex, contactIndex + 600);

    expect(scenarioIndex).toBeGreaterThan(-1);
    expect(scenarioIndex).toBeLessThan(nameIndex);
    expect(nameIndex).toBeLessThan(contactIndex);
    expect(contactMarkup).toContain('required=""');
    expect(contactMarkup).toContain("手机号或微信号");
    expect(html).not.toContain("对方联系方式");
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
    expect(css).toContain(".lead-capture-section");
    expect(css).toContain(".legal-disclaimer");
  });
});
