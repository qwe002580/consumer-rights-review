"use client";

import { useRef, useState } from "react";
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

const contactTimeOptions = [
  { value: "now", label: "现在方便" },
  { value: "30m", label: "30分钟后" },
  { value: "afternoon", label: "今天下午" },
  { value: "evening", label: "今天晚上" },
  { value: "tomorrow", label: "明天联系" }
];

const receiveMethodOptions = [
  { value: "wechat", label: "微信接收", hint: "适合需要继续补材料的情况" },
  { value: "phone", label: "电话沟通", hint: "适合金额较高或情况复杂" },
  { value: "sms", label: "短信提醒", hint: "先保留编号，稍后再看" },
  { value: "page", label: "只在本页查看", hint: "不留联系方式，也能生成结果" }
] satisfies Array<{
  value: IntakeInput["receiveMethod"];
  label: string;
  hint: string;
}>;

const applicableSituations = [
  "商家拒绝退款",
  "培训机构退费难",
  "医美项目做了一半想退款",
  "直播间/电商售后纠纷",
  "健身卡、摄影、婚庆服务退款",
  "付款后服务未履行"
];

const trustModules = [
  {
    title: "先看退费空间",
    copy: "很多退款纠纷不是不能处理，而是材料顺序和沟通节点没抓准。"
  },
  {
    title: "不直接给模板",
    copy: "页面只给初步诊断和材料缺口，关键处理方式需要结合完整证据判断。"
  },
  {
    title: "适合先筛查",
    copy: "如果金额、时间、证据存在差异，先做一次初筛能减少盲目投诉。"
  }
];

const complaintFailures = [
  "只说想退款，没有说清楚商家承诺和实际履行差距",
  "付款凭证、聊天记录、合同截图没有形成证据链",
  "过早把投诉、协商、起诉流程混在一起，反而让对方抓住漏洞"
];

type IntakeFormState = Omit<IntakeInput, "amount"> & {
  amount: string;
};

type AssessmentResponse = {
  id: string;
  assessmentNo: string;
  leadScore: string;
  analysis: PublicAnalysis;
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
  receiveMethod: "wechat",
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

export function getReceiveFieldVisibility(method: IntakeInput["receiveMethod"]) {
  return {
    wechat: method === "wechat",
    phone: method === "sms" || method === "phone",
    contactTime: method === "phone"
  };
}

function deriveContact(form: IntakeFormState) {
  if (form.receiveMethod === "wechat") return form.wechatId.trim();
  if (form.receiveMethod === "sms" || form.receiveMethod === "phone") {
    return form.phone.trim();
  }
  return "";
}

export function IntakeForm() {
  const [form, setForm] = useState<IntakeFormState>(initialState);
  const [assessment, setAssessment] = useState<AssessmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const showAgreement = ["education", "medical_beauty"].includes(form.scenario);
  const showInstallment = form.paymentMethod === "installment";
  const showPlatform = ["platform", "deadlock"].includes(form.stage);
  const showMissingEvidence = form.obstacles.includes("missing_evidence");
  const receiveFields = getReceiveFieldVisibility(form.receiveMethod);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const payload: IntakeInput = {
        ...form,
        amount: Number(form.amount),
        contact: deriveContact(form),
        wechatId: form.receiveMethod === "wechat" ? form.wechatId : "",
        phone: ["sms", "phone"].includes(form.receiveMethod) ? form.phone : "",
        contactTime: form.receiveMethod === "phone" ? form.contactTime : ""
      };

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error("信息暂时无法完成分析，请检查是否有必填项遗漏后重试。");
      }

      setAssessment(json as AssessmentResponse);
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (submissionError) {
      setAssessment(null);
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
      <section className="hero-card hero-card-balanced">
        <div>
          <p className="hero-product-name">退款纠纷自测</p>
          <h1>先判断能不能退，再决定怎么处理</h1>
          <p className="lede">
            填写付款、沟通、材料情况，生成免费初步评估和关键材料缺口。
          </p>
          <a className="hero-cta" href="#intake">
            开始免费案情初筛
          </a>
        </div>
        <div className="hero-proof-card" aria-label="自测说明">
          <strong>约 3 分钟</strong>
          <span>不需要上传文件</span>
          <span>结果页不展示联系方式</span>
        </div>
      </section>

      <section className="trust-module-grid" aria-label="自测说明">
        {trustModules.map((item) => (
          <article key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.copy}</p>
          </article>
        ))}
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

      <section className="screening-panel">
        <div>
          <h2>为什么自己投诉后还是没结果</h2>
          <p>多数卡点不在“有没有理”，而在事实、证据和表达顺序是否能被平台或商家接受。</p>
        </div>
        <ol>
          {complaintFailures.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="submission-flow" aria-label="提交流程">
        {["纠纷类型", "付款情况", "处理进度", "已有材料", "接收结果"].map((item, index) => (
          <div key={item}>
            <span>{index + 1}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </section>

      <div className="layout-grid" id="intake">
        <section className="form-panel">
          <div className="panel-header">
            <h2>我们会先做初步筛查</h2>
            <p className="muted-copy">信息越完整，越容易判断材料缺口和人工复核价值。</p>
          </div>

          <form className="intake-form" onSubmit={handleSubmit}>
            <label>
              <span>纠纷类型</span>
              <select
                value={form.scenario}
                onChange={(event) =>
                  setForm((current) => ({ ...current, scenario: event.target.value }))
                }
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
                min="1"
                type="number"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>

            <label>
              <span>购买或付款时间</span>
              <input
                required
                type="date"
                value={form.purchaseDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, purchaseDate: event.target.value }))
                }
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
                onChange={(event) =>
                  setForm((current) => ({ ...current, stage: event.target.value }))
                }
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
                  <label className="chip-option" key={option.value}>
                    <input
                      checked={form.issues.includes(option.value)}
                      type="checkbox"
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
                  <label className="chip-option" key={option.value}>
                    <input
                      checked={form.evidence.includes(option.value)}
                      type="checkbox"
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
                  <label className="chip-option" key={option.value}>
                    <input
                      checked={form.obstacles.includes(option.value)}
                      type="checkbox"
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
                onChange={(event) =>
                  setForm((current) => ({ ...current, goal: event.target.value }))
                }
              >
                {goalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>商家或机构名称</span>
              <input
                required
                placeholder="例如：某某培训机构、某某医美门店"
                value={form.merchantName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, merchantName: event.target.value }))
                }
              />
            </label>

            <label>
              <span>商家当时怎么承诺的</span>
              <input
                required
                placeholder="例如：承诺可退、承诺有效果、承诺按课时退"
                value={form.merchantPromise}
                onChange={(event) =>
                  setForm((current) => ({ ...current, merchantPromise: event.target.value }))
                }
              />
            </label>

            {showAgreement ? (
              <label>
                <span>协议或知情同意情况</span>
                <input
                  placeholder="例如：已签署并持有截图"
                  value={form.agreementStatus ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, agreementStatus: event.target.value }))
                  }
                />
              </label>
            ) : null}

            {showInstallment ? (
              <label>
                <span>分期或贷款状态</span>
                <input
                  placeholder="例如：已放款，正在扣款"
                  value={form.installmentStatus ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, installmentStatus: event.target.value }))
                  }
                />
              </label>
            ) : null}

            {showPlatform ? (
              <label>
                <span>平台处理结果</span>
                <input
                  placeholder="例如：平台仅支持部分退款"
                  value={form.platformResult ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, platformResult: event.target.value }))
                  }
                />
              </label>
            ) : null}

            {showMissingEvidence ? (
              <label>
                <span>目前最缺的材料类型</span>
                <input
                  placeholder="例如：聊天记录、合同、付款截图"
                  value={form.missingEvidenceType ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      missingEvidenceType: event.target.value
                    }))
                  }
                />
              </label>
            ) : null}

            <label className="wide">
              <span>补充说明</span>
              <textarea
                placeholder="请简要描述付款经过、商家回复、目前卡住的点。"
                rows={5}
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({ ...current, summary: event.target.value }))
                }
              />
            </label>

            <div className="lead-capture-section wide">
              <div className="lead-capture-heading">
                <span>最后一步</span>
                <strong>接收你的免费评估结果</strong>
                <p>你可以选择直接在本页查看；如果愿意继续复核，再留下联系方式。</p>
              </div>

              <fieldset className="receive-method-section">
                <legend>选择接收方式</legend>
                <div className="receive-method-grid">
                  {receiveMethodOptions.map((option) => (
                    <label className="receive-method-option" key={option.value}>
                      <input
                        checked={form.receiveMethod === option.value}
                        name="receiveMethod"
                        type="radio"
                        value={option.value}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            receiveMethod: option.value
                          }))
                        }
                      />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.hint}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

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

                {receiveFields.wechat ? (
                  <label>
                    <span>微信号</span>
                    <input
                      required
                      placeholder="用于发送评估编号和补充材料提醒"
                      value={form.wechatId}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, wechatId: event.target.value }))
                      }
                    />
                  </label>
                ) : null}

                {receiveFields.phone ? (
                  <label>
                    <span>手机号</span>
                    <input
                      required
                      inputMode="tel"
                      placeholder="请输入 11 位手机号"
                      value={form.phone}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </label>
                ) : null}

                {receiveFields.contactTime ? (
                  <label>
                    <span>方便沟通时间</span>
                    <select
                      required
                      value={form.contactTime}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contactTime: event.target.value as IntakeInput["contactTime"]
                        }))
                      }
                    >
                      <option value="">请选择</option>
                      {contactTimeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label>
                  <span>是否愿意补充材料</span>
                  <select
                    value={form.willingToSupplement}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        willingToSupplement: event.target.value as IntakeInput["willingToSupplement"]
                      }))
                    }
                  >
                    <option value="unknown">先看结果再说</option>
                    <option value="yes">愿意补充</option>
                    <option value="not_now">暂时不方便</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="form-actions wide">
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "正在生成初步评估..." : "生成我的免费评估结果"}
              </button>
            </div>
          </form>
        </section>

        <div ref={resultRef}>
          <AnalysisReport
            assessmentNo={assessment?.assessmentNo}
            caseId={assessment?.id}
            error={error}
            goal={form.goal}
            leadScore={assessment?.leadScore}
            loading={loading}
            result={assessment?.analysis ?? null}
            scenario={form.scenario}
          />
        </div>
      </div>

      <footer className="legal-disclaimer">
        本工具仅基于用户填写信息生成初步参考，不构成正式法律意见或结果承诺。具体处理方式需结合完整证据材料进一步判断。
      </footer>
    </main>
  );
}
