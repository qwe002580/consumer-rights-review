"use client";

import { useState } from "react";
import { AnalysisReport } from "@/components/analysis-report";
import type { AnalysisOutput, IntakeInput } from "@/lib/schema";

const scenarioOptions = [
  { value: "education", label: "教培退费" },
  { value: "medical_beauty", label: "医美纠纷" },
  { value: "ecommerce", label: "电商售后" },
  { value: "live_stream", label: "直播间消费" },
  { value: "gaming", label: "游戏充值" },
  { value: "food_delivery", label: "外卖餐饮" },
  { value: "logistics", label: "快递物流" },
  { value: "travel", label: "票务/旅游退款" },
  { value: "home_services", label: "家政/维修服务" },
  { value: "rental", label: "租房/公寓纠纷" },
  { value: "fitness", label: "健身/摄影/婚庆服务" },
  { value: "telecom", label: "话费/宽带/运营商" },
  { value: "digital_service", label: "会员订阅/数字服务" },
  { value: "used_goods", label: "二手交易" },
  { value: "auto_service", label: "买车/修车/养车服务" },
  { value: "pet_service", label: "宠物购买/医疗/寄养" },
  { value: "local_service", label: "到店消费/美容美发/洗浴" },
  { value: "other", label: "其他消费服务" }
];

const paymentMethodOptions = [
  { value: "full", label: "一次性付款" },
  { value: "deposit", label: "定金/预付款" },
  { value: "installment", label: "分期/贷款" }
];

const stageOptions = [
  { value: "none", label: "尚未正式沟通" },
  { value: "negotiating", label: "已与商家沟通" },
  { value: "platform", label: "已向平台投诉" },
  { value: "deadlock", label: "多轮沟通后仍无进展" }
];

const issueOptions = [
  { value: "misrepresentation", label: "宣传或承诺不符" },
  { value: "nonperformance", label: "服务未履行或未完成" },
  { value: "quality", label: "商品或服务质量问题" },
  { value: "refuse_refund", label: "商家拒绝退款" },
  { value: "extra_charge", label: "存在不合理扣费" },
  { value: "coercion", label: "诱导消费或强迫签约" }
];

const evidenceOptions = [
  { value: "payment", label: "付款记录" },
  { value: "contract", label: "合同/协议/知情同意" },
  { value: "chat", label: "聊天记录" },
  { value: "promo", label: "宣传页面或承诺截图" },
  { value: "invoice", label: "发票/收据/订单信息" },
  { value: "recording", label: "录音录像/现场照片" }
];

const obstacleOptions = [
  { value: "missing_evidence", label: "关键材料不完整" },
  { value: "merchant_delay", label: "商家持续拖延" },
  { value: "merchant_offline", label: "商家失联或拒绝回应" },
  { value: "platform_rejected", label: "平台已驳回或处理不充分" }
];

const goalOptions = [
  { value: "full_refund", label: "全额退款" },
  { value: "partial_refund", label: "部分退款" },
  { value: "cancel_installment", label: "解除分期或贷款" },
  { value: "compensation", label: "赔偿损失" },
  { value: "terminate_service", label: "解除合同或终止服务" }
];

type IntakeFormState = Omit<IntakeInput, "amount"> & {
  amount: string;
};

const initialState: IntakeFormState = {
  clientName: "",
  contact: "",
  scenario: "education",
  amount: "",
  purchaseDate: "",
  paymentMethod: "full",
  stage: "none",
  issues: [],
  evidence: [],
  obstacles: [],
  goal: "full_refund",
  summary: "",
  agreementStatus: "",
  installmentStatus: "",
  platformResult: "",
  missingEvidenceType: ""
};

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function IntakeForm() {
  const [form, setForm] = useState<IntakeFormState>(initialState);
  const [result, setResult] = useState<AnalysisOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showAgreement = ["education", "medical_beauty"].includes(form.scenario);
  const showInstallment = form.paymentMethod === "installment";
  const showPlatform = ["platform", "deadlock"].includes(form.stage);
  const showMissingEvidence = form.obstacles.includes("missing_evidence");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: IntakeInput = {
        ...form,
        amount: Number(form.amount)
      };

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error("信息暂时无法完成分析，请检查是否有必填项遗漏后重试。");
      }

      setResult(json.analysis as AnalysisOutput);
    } catch (submissionError) {
      setResult(null);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "系统暂时不可用，请稍后再试。"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Consumer Dispute Review</p>
          <h1>消费纠纷评估</h1>
          <p className="lede">
            3 分钟左右填写核心事实，系统会基于你提交的信息生成结构化初步判断，并提示优先补充的材料与下一步动作。
          </p>
        </div>
        <div className="hero-pills">
          <span>适用于退款、退费、售后纠纷</span>
          <span>先评估，再决定是否继续推进</span>
        </div>
      </section>

      <div className="layout-grid">
        <section className="form-panel">
          <div className="panel-header">
            <p className="eyebrow">Quick Intake</p>
            <h2>填写案件信息</h2>
          </div>

          <form className="intake-form" onSubmit={handleSubmit}>
            <label>
              <span>您的称呼</span>
              <input
                required
                value={form.clientName}
                onChange={(event) => setForm((current) => ({ ...current, clientName: event.target.value }))}
              />
            </label>

            <label>
              <span>对方联系方式</span>
              <input
                required
                placeholder="例如手机号、微信号、店铺客服方式"
                value={form.contact}
                onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))}
              />
              <small className="field-hint">这项仅用于分析和后续跟进，不会展示在结果页。</small>
            </label>

            <label>
              <span>纠纷类型</span>
              <select
                value={form.scenario}
                onChange={(event) => setForm((current) => ({ ...current, scenario: event.target.value }))}
              >
                {scenarioOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>支付金额</span>
              <input
                required
                type="number"
                min="1"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              />
            </label>

            <label>
              <span>购买或付款时间</span>
              <input
                required
                type="date"
                value={form.purchaseDate}
                onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))}
              />
            </label>

            <label>
              <span>付款方式</span>
              <select
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paymentMethod: event.target.value }))
                }
              >
                {paymentMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="wide">
              <span>当前处理进度</span>
              <select
                value={form.stage}
                onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value }))}
              >
                {stageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="wide chip-section">
              <legend>核心争议问题</legend>
              <div className="chip-grid">
                {issueOptions.map((option) => (
                  <label key={option.value} className="chip-option">
                    <input
                      type="checkbox"
                      checked={form.issues.includes(option.value)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          issues: toggleValue(current.issues, option.value)
                        }))
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="wide chip-section">
              <legend>目前已有材料</legend>
              <div className="chip-grid">
                {evidenceOptions.map((option) => (
                  <label key={option.value} className="chip-option">
                    <input
                      type="checkbox"
                      checked={form.evidence.includes(option.value)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          evidence: toggleValue(current.evidence, option.value)
                        }))
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="wide chip-section">
              <legend>当前主要障碍</legend>
              <div className="chip-grid">
                {obstacleOptions.map((option) => (
                  <label key={option.value} className="chip-option">
                    <input
                      type="checkbox"
                      checked={form.obstacles.includes(option.value)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          obstacles: toggleValue(current.obstacles, option.value)
                        }))
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="wide">
              <span>目前最想达到的结果</span>
              <select
                value={form.goal}
                onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))}
              >
                {goalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {showAgreement ? (
              <label>
                <span>协议或知情同意情况</span>
                <input
                  value={form.agreementStatus ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, agreementStatus: event.target.value }))
                  }
                  placeholder="例如：已签署并持有截图"
                />
              </label>
            ) : null}

            {showInstallment ? (
              <label>
                <span>分期或贷款状态</span>
                <input
                  value={form.installmentStatus ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, installmentStatus: event.target.value }))
                  }
                  placeholder="例如：已放款，正在扣款"
                />
              </label>
            ) : null}

            {showPlatform ? (
              <label>
                <span>平台处理结果</span>
                <input
                  value={form.platformResult ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, platformResult: event.target.value }))
                  }
                  placeholder="例如：平台仅支持部分退款"
                />
              </label>
            ) : null}

            {showMissingEvidence ? (
              <label>
                <span>目前最缺的材料类型</span>
                <input
                  value={form.missingEvidenceType ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, missingEvidenceType: event.target.value }))
                  }
                  placeholder="例如：聊天记录、合同、付款截图"
                />
              </label>
            ) : null}

            <label className="wide">
              <span>补充说明</span>
              <textarea
                rows={5}
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                placeholder="请简要描述商家承诺、实际发生经过，以及目前卡住的点。"
              />
            </label>

            <div className="form-actions wide">
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "正在整理结果..." : "查看分析结果"}
              </button>
            </div>
          </form>
        </section>

        <AnalysisReport error={error} loading={loading} result={result} />
      </div>
    </main>
  );
}
