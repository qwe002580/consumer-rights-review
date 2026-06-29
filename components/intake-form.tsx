"use client";

import { useState } from "react";
import { AnalysisReport } from "@/components/analysis-report";
import type { IntakeInput, PublicAnalysis } from "@/lib/schema";

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

const applicableSituations = [
  "商家拒绝退款",
  "培训机构退费难",
  "医美项目做了一半想退款",
  "直播间/电商售后纠纷",
  "健身卡、摄影、婚庆服务退款",
  "付款后服务未履行"
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
  missingEvidenceType: "",
  merchantName: "",
  merchantPromise: "",
  receiveMethod: "page",
  wechatId: "",
  phone: "",
  contactTime: "",
  willingToSupplement: "unknown"
};

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function IntakeForm() {
  const [form, setForm] = useState<IntakeFormState>(initialState);
  const [result, setResult] = useState<PublicAnalysis | null>(null);
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

      setResult(json.analysis as PublicAnalysis);
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
          <p className="hero-product-name">退款纠纷自测</p>
          <h1>3分钟判断你的钱还能不能退</h1>
          <p className="lede">
            填写付款、沟通、材料情况，生成初步处理建议和补充材料清单。
          </p>
        </div>
      </section>

      <section className="applicability-panel" aria-labelledby="applicability-title">
        <div className="applicability-heading">
          <h2 id="applicability-title">适合以下情况</h2>
          <p>如果你遇到下面任意一种情况，可以先完成自测。</p>
        </div>
        <div className="applicability-grid">
          {applicableSituations.map((situation) => (
            <div className="applicability-item" key={situation}>
              <span aria-hidden="true">✓</span>
              <strong>{situation}</strong>
            </div>
          ))}
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

            <div className="lead-capture-section wide">
              <div className="lead-capture-heading">
                <span>最后一步</span>
                <strong>接收并保存你的自测记录</strong>
                <p>填写本人信息，方便后续查看和继续沟通。</p>
              </div>
              <div className="lead-capture-grid">
                <label>
                  <span>您的称呼</span>
                  <input
                    required
                    value={form.clientName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, clientName: event.target.value }))
                    }
                  />
                </label>

                <label>
                  <span>您的联系方式</span>
                  <input
                    required
                    placeholder="手机号或微信号"
                    value={form.contact}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, contact: event.target.value }))
                    }
                  />
                  <small className="field-hint">
                    仅用于案件记录和后续联系，不会展示在自测结果中。
                  </small>
                </label>
              </div>
            </div>

            <div className="form-actions wide">
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "正在整理结果..." : "查看分析结果"}
              </button>
            </div>
          </form>
        </section>

        <AnalysisReport
          error={error}
          goal={form.goal}
          loading={loading}
          result={result}
          scenario={form.scenario}
        />
      </div>

      <footer className="legal-disclaimer">
        本工具仅基于用户填写信息生成初步参考，不构成正式法律意见或结果承诺。具体处理方式需结合完整证据材料进一步判断。
      </footer>
    </main>
  );
}
