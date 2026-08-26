import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import RenewalBadge from "@/components/RenewalBadge";
import AiCheck from "@/components/AiCheck";
import AskAi from "@/components/AskAi";
import Dossier, { DiagnosisMd } from "@/components/Dossier";
import AiTrendChart from "@/components/AiTrendChart";
import CopyButton from "@/components/CopyButton";
import ReportPanel from "@/components/ReportPanel";
import { REPORT_TYPES, recommendReportType, recommendFromAction } from "@/lib/report-skills";
import { extractAiConclusion, zhTerms } from "@/lib/markdown";

// client component 只需要 label,把 REPORT_TYPES 剪成可序列化的 {key: {label}}
const REPORT_TYPE_LABELS = Object.fromEntries(
  Object.entries(REPORT_TYPES).map(([k, v]) => [k, { label: v.label }])
);
import {
  STATUS_LABEL, ACCOUNT_STATUS_LABEL, ACTIVE_LEVEL_LABEL, SEVERITY_LABEL, SIGNAL_LABEL,
  SATISFACTION_LABEL, TRAJECTORY_LABEL, RISK_STATUS_LABEL, VERDICT_LABEL,
  fmtDate, fmtDateTime, fmtPct, fmtNum, fmtRatioPct, daysUntil, statusTagClass, sevTagClass, evidenceText,
  segmentBadgeClass, timingClass, verdictClass, evalTagChips, cadenceStageOf, STAGE_LABEL,
} from "@/lib/format";

// jsonb columns default to '{}' (eval_tags/ai_evaluation/next_action) rather than NULL,
// and evaluate.py explicitly writes ai_evaluation=NULL when the LLM pass was skipped or
// failed -- so "has real content" means both non-null AND non-empty here.
function nonEmpty(obj) {
  return obj && typeof obj === "object" && Object.keys(obj).length > 0 ? obj : null;
}

export default async function CustomerDetailPage({ params }) {
  // 在演示模式下，我们跳过会话验证
  const session = { user: { id: 'demo-user', name: 'Demo User', role: 'admin' } };
  
  // 如果没有传入有效的客户ID，使用默认的演示客户ID
  const customerId = params.id || 'demo-customer';
  
  // 获取客户信息
  let customer = {
    id: 'demo-customer',
    name: '演示客户',
    corp_name: '演示公司',
    status: 'active',
    contract_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90天后到期
    account_status: 'gold',
    active_level: 'high',
    satisfaction: 'satisfied',
    trajectory: 'stable',
    risk_status: 'low',
    last_contact: new Date(),
    next_renewal: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    revenue: 100000,
    owner: 'Demo Owner',
    bd: 'Demo BD',
    csm: 'Demo CSM',
    contract_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 合同60天后到期
    active_status: 'active',
    version: 'Professional',
    industry: 'Technology',
    consume_total: 50000,
    ai_spend_pct: 45.5,
    wecom_msgs_30d: 15,
    wecom_last_active: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    renewal_prob: 85,
    wecom_satisfaction: 'satisfied',
    wecom_trajectory: 'improving',
    updated_at: new Date(),
    as_of_date: new Date(),
    csm_name: 'CSM Demo',
    bd_name: 'BD Demo',
  };
  
  // 在演示模式下，我们不记录访问日志
  // await logVisit(session, "/customer"); // 页面类别,不带具体客户id(使用度统计,非行为跟踪)

  // 在演示模式下，模拟其他数据
  const risks = [];
  const snapshots = [];
  const dossier = {};
  const logs = [];
  const cadenceRules = [];
  const jiraTickets = [];
  const monthly = [];

  const aiEval = nonEmpty(customer.ai_evaluation);
  const nextAction = nonEmpty(customer.next_action);
  const coveragePct = customer.service_coverage ? fmtRatioPct(customer.service_coverage) : 75;
  // 档案的「AI 结论与建议」小节抽出来,进左栏对话开场(LC 2026-07-14)
  const dossierConclusion = dossier?.dossier_md
    ? zhTerms(extractAiConclusion(dossier.dossier_md) || "") || null
    : null;

  // 服务及时率口径自解释 (待办：服务覆盖率v2 反馈"看不懂") -- surface the cadence
  // standard actually driving the ratio: 标准每{interval}天1次 · 距上次{days}天.
  const cadenceStage = cadenceStageOf(customer.account_status);
  const cadenceRule = cadenceRules.find((r) => r.stage === cadenceStage);
  const cadenceMinPerMonth = cadenceRule ? Number(cadenceRule.min_per_month) : null;
  const cadenceIntervalDays = cadenceMinPerMonth > 0 ? Math.round(30 / cadenceMinPerMonth) : null;
  const daysSinceService = customer.last_service_date ? -daysUntil(customer.last_service_date) : null;

  // 「客户基本盘」 card grid derived values (需求⑩.2) -- kept here rather than inline JSX
  // since a couple need real null-vs-zero handling that reads poorly inlined.
  const shopCount = Array.isArray(customer.profile_ids) ? customer.profile_ids.length : 0;
  const hasSpendUsed = customer.spend_used !== null && customer.spend_used !== undefined && customer.spend_used !== "";
  const hasSpendCap = customer.spend_cap !== null && customer.spend_cap !== undefined && customer.spend_cap !== "";
  const spendValue = hasSpendUsed || hasSpendCap
    ? `${hasSpendUsed ? fmtNum(customer.spend_used) : "—"} / ${hasSpendCap ? fmtNum(customer.spend_cap) : "—"}`
    : "—";
  const spendPct = hasSpendUsed && hasSpendCap && Number(customer.spend_cap) > 0
    ? Math.round((Number(customer.spend_used) / Number(customer.spend_cap)) * 100)
    : null;
  // 客户口径优先: 「群活跃」对 CSM 的意义是客户参与度,我方刷屏不算客户活跃
  const hasCust = customer.wecom_cust_msgs_30d !== null && customer.wecom_cust_msgs_30d !== undefined;
  const msgs30dValue = hasCust
    ? `客户 ${customer.wecom_cust_msgs_30d}条`
    : customer.wecom_msgs_30d === null || customer.wecom_msgs_30d === undefined
      ? "—" : `${customer.wecom_msgs_30d ?? 0}条`;
  const msgs30dSub = hasCust ? `全群 ${customer.wecom_msgs_30d ?? 0}条（含我方）` : null;
  // 近6月均月耗: customer_monthly 最近6个完整月(当月未走完不计入, 避免月初被拉低)
  const thisYm = new Date().toISOString().slice(0, 7).replace("-", "");
  const past6 = monthly.filter((m) => m.ym < thisYm).slice(-6);
  const avg6Spend = past6.length ? past6.reduce((s, m) => s + (m.spend || 0), 0) / past6.length : null;
  // AI开启率(近6月): 花费加权 Σai/Σspend, 与月度曲线同源(名册口径)
  const p6Spend = past6.reduce((s, m) => s + (m.spend || 0), 0);
  const p6Ai = past6.reduce((s, m) => s + (m.ai || 0), 0);
  const ai6Pct = p6Spend > 0 ? Math.round((p6Ai / p6Spend) * 1000) / 10 : null;
  const contractDays = daysUntil(customer.contract_end);
  const contractSub = customer.contract_end && contractDays !== null
    ? (contractDays >= 0 ? `剩余${contractDays}天` : `已过期${Math.abs(contractDays)}天`)
    : null;

  // 计算合同到期天数，避免重复调用
  const contractDaysRemaining = daysUntil(customer.contract_end);

  return (
    <>
      <TopBar user={session.user} active="home" customer={customer} />
      <main className="page cust-two-col">
        <aside className="cust-side">
          <AskAi customer={customer} customerId={customer.id} customerName={customer.name}
                 inviteScript={nextAction?.script || null}
                 dossierConclusion={dossierConclusion} />
        </aside>
        <div className="cust-main">
        <Link href="/" className="backlink">← 返回首页</Link>

        <div className="head">
          <div>
            <h1>{customer.name}</h1>
            {customer.corp_name && customer.corp_name !== customer.name && (
              <div className="sub">{customer.corp_name}</div>
            )}
          </div>
          <span className={"tag " + statusTagClass(customer.active_status)}>
            {STATUS_LABEL[customer.active_status] || "未知"}
          </span>
        </div>

        {customer.auth_revoked?.n > 0 && (
          <div className="revoke-banner">
            ⚠️ 客户已取消 <b>{customer.auth_revoked.n}</b> 个店铺的广告授权
            （最近一次：<b>{customer.auth_revoked.latest}</b>
            {customer.auth_revoked.dates?.length > 1 &&
              `；其他批次：${customer.auth_revoked.dates.slice(1).join("、")}`}）
            —— 高危流失信号，请立即确认原因
          </div>
        )}
        <div className={"seg-banner " + (customer.segment ? segmentBadgeClass(customer.segment) : "seg-unknown")}>
          <span className="seg-banner-badge">{customer.segment || "待评估"}</span>
          <span className="seg-banner-reason">
            {customer.segment_reason || "评估数据生成中，今晚评估引擎跑完后显示。"}
          </span>
        </div>

        <div className="sec-t">📇 客户基本盘</div>
        <div className="factgrid">
          <Fact label="类目" value={customer.industry || "—"} sub={customer.industry2 || null} />
          <Fact label="版本" value={customer.version || "—"} />
          <Fact label="总消耗(全历史)"
                value={customer.consume_total != null ? `$${Number(customer.consume_total).toLocaleString()}` : "—"}
                sub={customer.consume_total != null ? "报表库实算·全部广告消耗" : null} />
          <Fact label="近6月均月耗"
                value={avg6Spend != null ? `$${Math.round(avg6Spend).toLocaleString()}` : "—"}
                sub={past6.length
                  ? `${past6[0].ym.slice(0,4)}/${past6[0].ym.slice(4)} - ${past6[past6.length-1].ym.slice(0,4)}/${past6[past6.length-1].ym.slice(4)} 共${past6.length}个完整月`
                  : "月度数据积累中"}
                muted={avg6Spend == null} />
          <Fact label="额度使用" value={spendValue} bar={spendPct} />
          <Fact label="店铺数" value={shopCount === null ? "—" : shopCount} />
          <Fact label="Campaign数(AI/全部)"
                value={customer.campaign_cnt != null
                  ? `${customer.ai_campaign_cnt != null ? Number(customer.ai_campaign_cnt).toLocaleString() : "—"} / ${Number(customer.campaign_cnt).toLocaleString()}`
                  : "—"}
                sub={customer.campaign_cnt > 0 && customer.ai_campaign_cnt != null
                  ? `AI 托管占 ${Math.round((customer.ai_campaign_cnt / customer.campaign_cnt) * 100)}%`
                  : null} />
          <Fact label="AI开启率(本月)"
                value={customer.ai_spend_pct != null ? `${+Number(customer.ai_spend_pct).toFixed(2)}%` : fmtPct(customer.ai_adoption_pct)}
                sub={customer.ai_spend_pct != null ? "后台AI托管名册口径" : "profile均值口径(待夜间刷新)"} />
          <Fact label="AI开启率(近6月)"
                value={ai6Pct != null ? `${ai6Pct}%` : "—"}
                sub={past6.length ? `花费加权 · ${past6.length}个完整月` : "月度数据积累中"}
                muted={ai6Pct == null} />
          <Fact label="活跃层级" value={ACTIVE_LEVEL_LABEL[customer.active_status] || "—"} />
          <Fact label="服务阶段" value={customer.service_stage || "—"}
                sub={STAGE_LABEL[customer.service_stage]?.desc || (customer.service_stage ? null : "合同日期未维护")}
                muted={!customer.service_stage} />
          <Fact label="群活跃30天" value={msgs30dValue} sub={msgs30dSub} />
          <Fact label="30天登录"
                value={customer.login_days_30d != null ? `${customer.login_days_30d} 天` : "暂无数据"}
                sub={customer.login_accounts
                  ? `账号 ${customer.login_accounts.active}/${customer.login_accounts.total} 个近30天登录过`
                  : null}
                muted={customer.login_days_30d == null} />
          <Fact label="合同到期" value={customer.contract_end ? fmtDate(customer.contract_end) : "—"} sub={contractSub} />
          <Fact label="广告ACOS(30天)"
                value={customer.acos_30d != null ? `${customer.acos_30d}%` : "暂无数据"}
                sub={customer.acos_30d != null && customer.peer_acos_median != null
                  ? `消耗 $${Number(customer.ads_spend_30d ?? 0).toLocaleString()} · 大盘中位 ${customer.peer_acos_median}%${Number(customer.acos_30d) <= Number(customer.peer_acos_median) ? "（优于大盘）" : "（高于大盘）"}`
                  : customer.ads_spend_30d != null ? `消耗 $${Number(customer.ads_spend_30d).toLocaleString()}` : undefined}
                muted={customer.acos_30d == null} />
          <Fact label="AI广告ACOS(30天)"
                value={customer.ai_acos_30d != null ? `${customer.ai_acos_30d}%` : "暂无数据"}
                muted={customer.ai_acos_30d == null} />
          <Fact label="广告销售额(30天)"
                value={customer.ads_sales_30d != null ? `$${Number(customer.ads_sales_30d).toLocaleString()}` : "暂无数据"}
                sub={customer.sales_growth_pct != null
                  ? `环比 ${Number(customer.sales_growth_pct) > 0 ? "+" : ""}${customer.sales_growth_pct}% ${Number(customer.sales_growth_pct) >= 5 ? "↑" : Number(customer.sales_growth_pct) <= -5 ? "↓" : "→"}${customer.peer_growth_median != null ? ` · 大盘中位 ${Number(customer.peer_growth_median) > 0 ? "+" : ""}${customer.peer_growth_median}%` : ""}`
                  : "环比数据积累中"}
                muted={customer.ads_sales_30d == null} />
        </div>
        {customer.renewal_tracking && (() => {
          const rt = customer.renewal_tracking;
          const lightCls = /不续约|红/.test(rt.light || "") ? "seg-risk"
            : /^续约$|已续约|绿/.test(rt.light || "") ? "t-low" : "t-med";
          const diffs = [];
          if (rt.version && customer.version && rt.version !== customer.version)
            diffs.push(`版本: 台账 ${rt.version} vs CRM ${customer.version}`);
          const crmEnd = customer.contract_end
            ? new Date(customer.contract_end).toISOString().slice(0, 10) : null;
          if (rt.contract_end && crmEnd && rt.contract_end !== crmEnd)
            diffs.push(`合同到期: 台账 ${rt.contract_end} vs CRM ${crmEnd}`);
          return (
            <>
              <div className="sec-t">🚦 重点续约跟踪（2026Q3 台账）</div>
              <div style={{ border: "1px solid var(--line,#e2e8e5)", borderRadius: 10,
                            padding: "12px 16px", marginBottom: 18 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {rt.light && <span className={"tag " + lightCls}>风险灯 {rt.light}</span>}
                  {rt.status && <span className="tag">{rt.status}</span>}
                  {rt.risk_level && <span className="tag">{rt.risk_level}</span>}
                  {rt.due_month && <span className="tag">应续 {rt.due_month}</span>}
                  {(rt.tier_prev || rt.tier_now) && (
                    <span className="tag">档位 {rt.tier_prev || "—"} → {rt.tier_now || "—"}</span>
                  )}
                  {rt.spend && <span className="tag">月花费 ${Number(rt.spend) ? Math.round(Number(rt.spend)).toLocaleString() : rt.spend}</span>}
                  {rt.version && <span className="tag">{rt.version}</span>}
                </div>
                {[["服务策略", rt.strategy], ["本周动作", rt.week_action],
                  ["下一步计划", rt.next_plan], ["负责人/支援方", rt.support], ["备注", rt.note]]
                  .filter(([, v]) => v)
                  .map(([label, v]) => (
                    <div key={label} style={{ marginBottom: 6 }}>
                      <span className="meta" style={{ fontWeight: 700 }}>{label}：</span>
                      <span style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{v}</span>
                    </div>
                  ))}
                {diffs.length > 0 && (
                  <div className="svc-gap" style={{ marginTop: 6 }}>⚠️ 与 CRM 口径不一致，请校准：{diffs.join("；")}</div>
                )}
                <p className="meta" style={{ margin: "6px 0 0" }}>
                  来源: 飞书「2026Q3 重点续约客户跟踪表」(人工台账 · 每晚同步){rt.csm ? ` · 台账负责人 ${rt.csm}` : ""}
                </p>
              </div>
            </>
          );
        })()}
        {customer.signing_expectations && (
          <>
            <div className="sec-t">🎯 签约期待（CRM）</div>
            <div style={{ border: "1px solid var(--line,#e2e8e5)", borderRadius: 10,
                          padding: "12px 16px", marginBottom: 18 }}>
              {(customer.signing_expectations.goals?.length > 0 ||
                customer.signing_expectations.ai_target != null ||
                customer.signing_expectations.ai_spend_expect != null ||
                customer.signing_expectations.ai_rate_band) && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {(customer.signing_expectations.goals || []).map((g) => (
                    <span key={g} className="tag">{g}</span>
                  ))}
                  {customer.signing_expectations.ai_target != null && (
                    <span className="tag">AI目标 {customer.signing_expectations.ai_target}%</span>
                  )}
                  {customer.signing_expectations.ai_spend_expect != null && (
                    <span className="tag">期望AI花费占比 {customer.signing_expectations.ai_spend_expect}%</span>
                  )}
                  {customer.signing_expectations.ai_rate_band && (
                    <span className="tag">期望AI区间 {customer.signing_expectations.ai_rate_band}</span>
                  )}
                </div>
              )}
              {[["BD 签约期待", customer.signing_expectations.bd],
                ["CSM 侧期待", customer.signing_expectations.csm],
                ["对Xnurta的期待", customer.signing_expectations.expect_text],
                ["期望系统用法", customer.signing_expectations.sys_usage]]
                .filter(([, v]) => v)
                .map(([label, v]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div className="meta" style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.65 }}>{v}</div>
                  </div>
                ))}
              <p className="meta" style={{ margin: "6px 0 0" }}>
                来源: CRM 企微群档案(BD/CSM填写) + 商机记录，每晚同步。服务与续约沟通请对照客户当下数据回看这些承诺点。
              </p>
            </div>
          </>
        )}
        {customer.login_accounts?.top?.length > 0 && (
          <div className="meta" style={{ marginTop: -8, marginBottom: 18 }}>
            最活跃账号：
            {customer.login_accounts.top.map((t, i) => (
              <span key={t.u}>
                {i > 0 ? " · " : ""}
                {t.u}（{t.days}天{t.sub ? "·子账号" : ""}，最近 {fmtDate(t.last)}）
              </span>
            ))}
          </div>
        )}

        <div className="sec-t">🤖 AI 建议 · 这个客户怎么服务</div>
        {customer.service_reco && (customer.service_reco.customer_type || customer.service_reco.next_advice) && (
          <div className="card reco-card">
            <div className="reco-grid">
              {customer.service_reco.customer_type && (
                <div className="reco-item"><span className="reco-k">客户类型</span><span className="reco-v">{customer.service_reco.customer_type}</span></div>
              )}
              {customer.service_reco.interests && (
                <div className="reco-item"><span className="reco-k">关注 / 兴趣</span><span className="reco-v">{customer.service_reco.interests}</span></div>
              )}
              {customer.service_reco.traits && (
                <div className="reco-item"><span className="reco-k">客户特点</span><span className="reco-v">{customer.service_reco.traits}</span></div>
              )}
              {customer.service_reco.past_style && (
                <div className="reco-item"><span className="reco-k">过去服务方式</span><span className="reco-v">{customer.service_reco.past_style}</span></div>
              )}
            </div>
            {customer.service_reco.next_advice && (
              <div className="reco-advice"><b>下阶段服务建议：</b>{customer.service_reco.next_advice}</div>
            )}
          </div>
        )}
        {nextAction && nextAction.type ? (
          // 会议助手 v2 (LC 2026-07-19 重设计): 基于客户现状 → 用什么方式开会 + 完整议程
          // (每步挂材料/工具) → 会议目的与客户 key take-away;议程引用的材料由夜间引擎自动
          // 配齐(图标化 DOCX 下载);诊断工具从工具中心真实清单里选;手动生成报告=进阶选项。
          (() => {
            const ma = nonEmpty(customer.meeting_assistant);
            const v2 = ma && Array.isArray(ma.agenda) && ma.agenda.length > 0;
            const matLabel = (t) => REPORT_TYPE_LABELS[t]?.label || t;
            return (
              <div className="ma-card">
                <div className="ma-head">
                  <span className="ma-title">🤝 会议助手</span>
                  <span className={"tag " + timingClass(nextAction.timing)}>{nextAction.timing || "—"}</span>
                  <span className="ma-mtype">{(ma && ma.meeting_type) || nextAction.type}</span>
                  {v2 && ma.meeting_method && <span className="ma-method">{ma.meeting_method}</span>}
                </div>
                {v2 && ma.situation && (
                  <div className="ma-situation">📌 {ma.situation}</div>
                )}
                <div className="ma-grid">
                  <div className="ma-main">
                    <div className="ma-block">
                      <div className="ma-k">为什么现在开这个会</div>
                      <div className="ma-v">{(ma && ma.why) || nextAction.reason || "今晚评估引擎跑完后生成完整开会方案。"}</div>
                    </div>
                    {v2 && (
                      <div className="ma-block">
                        <div className="ma-k">📋 怎么开(会议议程)</div>
                        <ol className="ma-agenda">
                          {ma.agenda.map((s, i) => (
                            <li key={i}>
                              <span className="ma-step-t">{s.title}</span>
                              {s.detail && <span className="ma-step-d">{s.detail}</span>}
                              {(s.material || s.tool) && (
                                <span className="ma-step-badges">
                                  {s.material && <span className="ma-badge ma-badge-mat">📄 {matLabel(s.material)}</span>}
                                  {s.tool && <span className="ma-badge ma-badge-tool">🧰 {s.tool}</span>}
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    <div className="ma-block ma-purpose">
                      <div className="ma-k">🎯 会议要达成的目的</div>
                      <div className="ma-v">{(ma && ma.purpose) || nextAction.goal || "—"}</div>
                    </div>
                    {ma && Array.isArray(ma.takeaways) && ma.takeaways.length > 0 && (
                      <div className="ma-block">
                        <div className="ma-k">🎁 客户的 key take-away</div>
                        <ul className="ma-takeaways">
                          {ma.takeaways.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="ma-side">
                    {v2 && ma.tools && ma.tools.length > 0 && (
                      <div className="ma-block">
                        <div className="ma-k">🧰 用什么工具帮客户诊断</div>
                        <div className="ma-tools">
                          {ma.tools.map((t, i) => (
                            <div className="ma-tool" key={i}>
                              {t.url ? (
                                <a className="ma-tool-nm" href={`/api/tool-jump?u=${encodeURIComponent(t.url)}`}
                                   target="_blank" rel="noopener noreferrer">{t.name} →</a>
                              ) : (
                                <Link className="ma-tool-nm" href="/tools">{t.name} →</Link>
                              )}
                              {t.how && <div className="ma-tool-how">{t.how}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {v2 && ma.report_story && (
                      <div className="ma-block">
                        <div className="ma-k">📖 报告主线</div>
                        <div className="ma-v ma-story">{ma.report_story}</div>
                      </div>
                    )}
                    <div className="ma-block">
                      <div className="ma-k">📄 会议材料{v2 && ma.materials?.length ? "(已按议程自动配齐)" : ""}</div>
                      {v2 && ma.materials?.length ? (
                        <>
                          <div className="rp-list" style={{ marginTop: 4 }}>
                            {ma.materials.map((m) => (
                              <div className="rp-row" key={m.report_id}>
                                <span className="rp-ico" aria-hidden>📄</span>
                                <span className="rp-main">
                                  <span className="rp-name">{matLabel(m.report_type)}</span>
                                </span>
                                <span className="rp-acts">
                                  <a className="rp-dl" href={`/api/reports/${m.report_id}?fmt=docx`} title="下载 Word 文档">⬇︎ DOCX</a>
                                  <a className="rp-mini" href={`/api/reports/${m.report_id}?dl=1`}>.md</a>
                                </span>
                              </div>
                            ))}
                          </div>
                          <details className="ma-adv">
                            <summary>进阶:自动材料不够用?自选类型生成 ▾</summary>
                            <ReportPanel customerId={customer.id} types={REPORT_TYPE_LABELS}
                                         recommended={recommendFromAction(nextAction, customer)} bare />
                          </details>
                        </>
                      ) : (
                        <ReportPanel customerId={customer.id} types={REPORT_TYPE_LABELS}
                                     recommended={recommendFromAction(nextAction, customer)} bare />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="empty">
            暂无推荐行动——今晚评估引擎跑完后生成，或该客户当前无需额外服务。
            <ReportPanel customerId={customer.id} types={REPORT_TYPE_LABELS}
                         recommended={recommendReportType(customer)} />
          </div>
        )}
        {Array.isArray(customer.top_asins) && customer.top_asins.length > 0 && (
          <>
            <div className="sec-t">🏆 销量 Top ASIN（近30天日均 · 最大3个站点各Top5 · 点击直达亚马逊）</div>
            <div className="card">
              {(customer.top_asins[0]?.list
                ? customer.top_asins
                : [{ cc: null, s: null, list: customer.top_asins }]).map((site, si) => (
                <div key={site.cc || si} style={{ marginBottom: si < customer.top_asins.length - 1 ? 14 : 0 }}>
                  {site.cc && (
                    <div className="dossier-h3" style={{ margin: "0 0 6px" }}>
                      {site.cc} 站（日均 ${Math.round(site.s / 30).toLocaleString()}）
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {(site.list || []).map((t, i) => (
                      <a key={t.a + si} href="#" target="_blank" rel="noreferrer"
                        className="asinchip">
                        <span className="asinrank">#{i + 1}</span>
                        <b>{t.a}</b>
                        <span className="meta">日均 ${Math.round(t.s / 30).toLocaleString()}{t.u != null ? ` · ${Math.round(t.u / 30).toLocaleString()}件/日` : ""}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {monthly.length >= 2 && (
          <>
            <div className="sec-t">📈 AI 开启率(近12个月)</div>
            <div className="card">
              <AiTrendChart rows={monthly} currentYm={new Date().toISOString().slice(0, 7).replace("-", "")} />
            </div>
          </>
        )}
        {dossier?.diagnosis_md && (
          <>
            <div className="sec-t">🩺 客户诊断</div>
            <div className="card dossiercard">
              <DiagnosisMd md={dossier.diagnosis_md} />
            </div>
          </>
        )}
        {dossier?.dossier_md && (
          <>
            <div className="sec-t">🗂 AI 档案</div>
            <div className="card dossiercard">
              <Dossier md={dossier.dossier_md} digest={dossier.daily_digest_md} />
            </div>
            <div className="meta" style={{ marginBottom: 22 }}>档案更新于 {fmtDate(dossier.updated_at) || "—"}</div>
          </>
        )}

        {/* KYC 模块 - 在合同到期日前60天需要完成 */}
        <div className="sec-t">📋 KYC（合同到期日前60天完成）</div>
        <div className="card">
          <div className="kyc-section">
            <div className="kyc-subsection">
              <h3>运营层（CSM填写）</h3>
              <div className="kyc-questions">
                <div className="kyc-question">
                  <label>Q1：是否有竞品触达？</label>
                  <div className="kyc-answer-field"></div>
                </div>
                <div className="kyc-question">
                  <label>Q2：是否自研ERP、agent部署？</label>
                  <div className="kyc-answer-field"></div>
                </div>
                <div className="kyc-question">
                  <label>Q3：运营使用感受？</label>
                  <div className="kyc-answer-field"></div>
                </div>
                <div className="kyc-question">
                  <label>Q4：系统价值如何证明？</label>
                  <div className="kyc-answer-field"></div>
                </div>
              </div>
            </div>
            <div className="kyc-subsection">
              <h3>决策层（BD填写）</h3>
              <div className="kyc-questions">
                <div className="kyc-question">
                  <label>Q1：老板对系统的知晓及满意情况？</label>
                  <div className="kyc-answer-field"></div>
                </div>
                <div className="kyc-question">
                  <label>Q2：下一年整体、合作预算？</label>
                  <div className="kyc-answer-field"></div>
                </div>
                <div className="kyc-question">
                  <label>Q3：C-level 人员 KPI</label>
                  <div className="kyc-answer-field"></div>
                </div>
                <div className="kyc-question">
                  <label>Q4：客户组织架构关系</label>
                  <div className="kyc-answer-field"></div>
                </div>
                <div className="kyc-question">
                  <label>Q5：Stakeholder图谱</label>
                  <div className="kyc-answer-field"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="kyc-contract-info">
            <span className="meta">合同到期日：{fmtDate(customer.contract_end) || "—"}</span>
            {customer.contract_end && (
              <span className={"tag " + (contractDaysRemaining <= 60 ? "seg-risk" : "t-low")}>剩余 {contractDaysRemaining} 天</span>
            )}
            {customer.contract_end && contractDaysRemaining <= 60 && (
              <div className="kyc-reminder">⚠️ 注意：距离合同到期日不足60天，请尽快完成KYC填写</div>
            )}
          </div>
        </div>

        <div className="sec-t">AI 综合评估</div>
        <div className="card">
          <div className="verdict-grid">
            <VerdictCard title="喜欢产品？" v={aiEval?.likes_product} />
            <VerdictCard title="产品有价值？" v={aiEval?.product_value} />
            <VerdictCard title="生意在增长？" v={aiEval?.business_growth} />
          </div>
          <div className="renewal-compare">
            <div className="rc-item">
              <div className="rc-label">规则分</div>
              <RenewalBadge value={customer.renewal_prob} />
            </div>
            <div className="rc-item">
              <div className="rc-label">LLM评估</div>
              <RenewalBadge value={aiEval?.renewal_prob_llm} />
            </div>
          </div>
          {!aiEval && (
            <div className="meta">暂无 AI 综合评估——该客户可能尚未进入 LLM 评估范围，或评估引擎尚未运行。</div>
          )}
        </div>

        <div className="sec-t">标签</div>
        <div className="tagchip-row">
          {evalTagChips(customer.eval_tags).map((c) => (
            <span key={c.label} className={"tagchip" + (c.noData ? " nodata" : "")}>
              <span className="tc-label">{c.label}</span>
              <span className="tc-value">{c.value}</span>
            </span>
          ))}
        </div>

        <div className="sec-t" title="及时率口径：应服务间隔（30÷每月最低服务次数）÷距上次服务天数，封顶100%">🧭 服务情况</div>
        <div className="card">
          <div className="coverage-row">
            <div className="coverage-bar">
              <i className={coveragePct !== null && coveragePct < 50 ? "low" : ""} style={{ width: `${coveragePct ?? 0}%` }} />
            </div>
            <div className="coverage-pct">{coveragePct !== null ? `及时率 ${coveragePct}%` : "暂无数据"}</div>
          </div>
          <div className="meta">
            {cadenceIntervalDays !== null ? `标准每${cadenceIntervalDays}天1次` : "暂无服务频率标准"}
            {daysSinceService !== null ? ` · 距上次${daysSinceService}天` : ""}
            {" · 最近一次服务日期："}{fmtDate(customer.last_service_date) || "暂无记录"}
            <span className="meta">（来自 CRM 服务日期字段）</span>
          </div>
          {customer.service_history && (
            <>
              <div className="svc-divider" />
              <div className="r1">
                <span className={"tag " + ({ "达标": "t-low", "不足": "t-med", "严重不足": "seg-risk" }[customer.service_history.verdict] || "t-neutral")}>
                  近6个月 · {customer.service_history.verdict}
                </span>
                <span className="meta">
                  CRM 记录明细 {customer.service_history.count_6m ?? 0} 条 · AI 判断更新于 {fmtDate(customer.service_history.date) || "—"}
                </span>
              </div>
              <div className="svc-summary">{customer.service_history.summary}</div>
              {customer.service_history.gap && (
                <div className="svc-gap">⚠️ {customer.service_history.gap}</div>
              )}
              {customer.service_history.items?.length > 0 ? (
                <table className="tbl" style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>日期</th>
                      <th style={{ width: 90 }}>类型</th>
                      <th>动作</th>
                      <th>备注 / 状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(customer.service_history.items || []).map((it, k) => (
                      <tr key={k}>
                        <td>{fmtDate(it.d)}</td>
                        <td>{it.kind}</td>
                        <td>{it.name || "—"}</td>
                        <td>{[it.note, it.status].filter(Boolean).join(" · ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="meta" style={{ marginTop: 8 }}>
                  说明：「最近服务日期」有值但近6个月无记录明细，通常是服务发生后只更新了日期、未在 CRM
                  留下服务/跟进记录（服务过但未留痕）——两者并不矛盾，按日期口径计算断档天数，按明细口径评估记录完整性。
                </div>
              )}
            </>
          )}
          {customer.meeting_summary && (
            <>
              <div className="svc-divider" />
              <div className="r1"><span className="tag t-low">📋 会议记录 AI 总结</span>
                <span className="meta">基于 {customer.meeting_summary.count ?? 0} 场会议</span></div>
              {customer.meeting_summary.overall_feedback && (
                <div className="svc-summary"><b>客户整体反馈：</b>{customer.meeting_summary.overall_feedback}</div>
              )}
              {customer.meeting_summary.types?.length > 0 && (
                <div className="meta" style={{ marginTop: 6 }}>提供过的会议类型：
                  {customer.meeting_summary.types.map((t, i) => (
                    <span key={i} className="tag t-neutral" style={{ marginLeft: 4 }}>{t}</span>
                  ))}
                </div>
              )}
              {customer.meeting_summary.effectiveness && (
                <div className="meta" style={{ marginTop: 6 }}>💡 有效性推断：{customer.meeting_summary.effectiveness}</div>
              )}
            </>
          )}
          {customer.meeting_records?.length > 0 && (
            <>
              <div className="svc-divider" />
              <details>
                <summary className="r1" style={{ cursor: "pointer", listStyle: "none" }}>
                  <span className="tag t-neutral">📅 过往会议记录明细（近12个月，来自 CRM）</span>
                  <span className="meta">共 {customer.meeting_records.length} 场 · 点击展开</span>
                </summary>
              <table className="tbl" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>日期</th>
                    <th style={{ width: 130 }}>会议类型</th>
                    <th>客户反馈 / 会议纪要</th>
                    <th style={{ width: 90 }}>KP满意度</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.meeting_records.map((m, k) => (
                    <tr key={k}>
                      <td>{fmtDate(m.d)}</td>
                      <td>{m.type || "—"}</td>
                      <td>
                        {m.feedback ? <div>{m.feedback}</div> : null}
                        {m.summary && m.summary !== m.feedback ? <div className="meta">纪要：{m.summary}</div> : null}
                        {m.purpose ? <div className="meta">目的：{m.purpose}</div> : null}
                        {!m.feedback && !m.summary && !m.purpose ? "—" : null}
                      </td>
                      <td>{m.kp_sat || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </details>
            </>
          )}
        </div>

        <div className="factgrid">
          <Fact label="账户状态" value={ACCOUNT_STATUS_LABEL[customer.account_status] || customer.account_status || "—"} />
          <Fact label="版本" value={customer.version || "—"} />
          <Fact label="所属 CSM" value={customer.csm_name || "—"} />
          <Fact label="所属 BD" value={customer.bd_name || "—"} />
          <Fact label="累计消耗" value={fmtNum(customer.consume_total)} />
          <Fact label="AI 开启率" value={customer.ai_spend_pct != null ? `${+Number(customer.ai_spend_pct).toFixed(2)}%` : fmtPct(customer.ai_adoption_pct)} />
          <Fact label="近30天群消息" value={customer.wecom_msgs_30d ?? "—"} />
          <Fact label="群最近活跃" value={fmtDate(customer.wecom_last_active) || "—"} />
          <Fact label="合同到期日" value={fmtDate(customer.contract_end) || "—"} />
          <Fact label="续约概率" value={<RenewalBadge value={customer.renewal_prob} />} />
        </div>

        {customer.renewal_prob !== null && customer.renewal_prob !== undefined && (
          <>
            <div className="sec-t">续约概率评估依据</div>
            <div className="card">
              {Array.isArray(customer.renewal_prob_reasons) && customer.renewal_prob_reasons.length > 0 ? (
                <ul className="reasonlist">
                  {customer.renewal_prob_reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <div className="meta">该分数无额外加减分依据（基础分）。</div>
              )}
            </div>
          </>
        )}

        <div className="sec-t">企业微信洞察</div>
        <div className="card">
          {customer.roomid == null || customer.roomid === "" ? (
            // 客户未关联企业微信群 -> 明确显示无消息, 而不是误导性的"暂无分析/尚未完成分析"
            // (LC 2026-07-16: 没有企微群时企微消息分析要显示无企业微信消息)。
            <div className="empty">无企业微信消息（该客户未关联企业微信群）</div>
          ) : (
            <>
              <div className="r1">
                <div className="nm">
                  满意度：{SATISFACTION_LABEL[customer.wecom_satisfaction] || "暂无分析"}
                  {TRAJECTORY_LABEL[customer.wecom_trajectory] ? (
                    <span style={{ marginLeft: 8, color: TRAJECTORY_LABEL[customer.wecom_trajectory].color }}>
                      轨迹 {TRAJECTORY_LABEL[customer.wecom_trajectory].text}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="meta">{customer.wecom_summary || "暂无 AI 摘要（近期无群消息，或尚未完成分析）。"}</div>
              {customer.wecom_service_quality?.score != null ? (
                <div className="meta">
                  我方服务动作：{customer.wecom_service_quality.score}/100
                  {customer.wecom_service_quality.note ? `（${customer.wecom_service_quality.note}）` : ""}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="sec-t">🎫 Jira 工单</div>
        <div className="card">
          {customer.jira_module_summary?.modules?.length > 0 && (
            <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {customer.jira_module_summary.modules.map((m) => (
                  <span className="tag t-neutral" key={m.module} title={m.need || ""}>
                    {m.module} ×{m.count}
                  </span>
                ))}
              </div>
              {customer.jira_module_summary.insight && (
                <div className="meta">💡 {customer.jira_module_summary.insight}</div>
              )}
            </div>
          )}
          {jiraTickets.length === 0 ? (
            <div className="meta">暂无关联工单（工单按标题前缀「客户名/…」自动归属；Jira 同步每日运行）。</div>
          ) : (
            <div className="loglist">
              {jiraTickets.map((t) => (
                <div className="logcard" key={t.issue_key}>
                  <div className="r1">
                    <div className="nm">
                      <a href={t.url} target="_blank" rel="noreferrer" style={{ color: "var(--primarytx)" }}>
                        {t.issue_key}
                      </a>
                      <span className={"tag " + (t.resolution ? "t-low" : t.status === "In Progress" ? "t-med" : "t-neutral")}
                            style={{ marginLeft: 8 }}>
                        {t.resolution ? `已解决` : t.status || "—"}
                      </span>
                    </div>
                    <div className="meta">{fmtDate(t.updated)}</div>
                  </div>
                  <div className="logcontent">{t.summary}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sec-t" id="svclog">📝 服务日志</div>
        <div className="card">
          <form action="/api/logs" method="POST">
            <input type="hidden" name="customer_id" value={customer.id} />
            <div className="field">
              <label htmlFor="log-content">记录本次服务/沟通内容</label>
              <textarea
                id="log-content"
                name="content"
                rows={3}
                placeholder="例如：电话沟通续约意向，客户对XX功能有疑虑，已提供解决方案…"
                required
              />
              <AiCheck inputId="log-content" context="CSM服务日志" />
            </div>
            <div className="btnrow">
              <button type="submit" className="btn p">提交</button>
            </div>
          </form>
        </div>
        {logs.length === 0 && !customer.renewal_tracking?.assist ? (
          <div className="empty">暂无服务日志记录。</div>
        ) : (
          <div className="loglist">
            {customer.renewal_tracking?.assist && (
              <div className="card logcard" style={{ background: "var(--surface3,#fbf7ee)" }}>
                <div className="r1">
                  <span className="nm">🟡 黄灯协助跟进（Q3 续约台账）</span>
                  <span className="meta">每晚同步 · 台账负责人 {customer.renewal_tracking.csm || "—"}</span>
                </div>
                <div className="logcontent" style={{ whiteSpace: "pre-wrap" }}>{customer.renewal_tracking.assist}</div>
              </div>
            )}
            {logs.map((l) => (
              <div className="card logcard" key={l.id}>
                <div className="r1">
                  <span className="nm">{l.author_name || "—"}</span>
                  <span className="meta">{fmtDateTime(l.created_at)}</span>
                </div>
                <div className="logcontent">{l.content}</div>
              </div>
            ))}
          </div>
        )}

        <div className="sec-t">风险信号历史</div>
        {risks.length === 0 ? (
          <div className="empty">暂无风险信号记录。</div>
        ) : (() => {
          // LC 2026-08-15 二迭: 同一信号逐日重发(超额消耗一天一条,23条open全摊开)必须归组
          // -- 每类信号只展示最新一条, 带「共N次·首次日期」徽标, 全部原始记录收进折叠。
          // LLM 史评在上方「客户诊断」卡的 🚩 节。risks 已按 date DESC 排好。
          const riskCard = (r, extra) => (
            <div className="card" key={r.id}>
              <div className="r1">
                <div className="nm">{fmtDate(r.date)} · {SIGNAL_LABEL[r.signal_type] || r.signal_type}{extra}</div>
                <span className={"tag " + sevTagClass(r.severity)}>{SEVERITY_LABEL[r.severity] || r.severity}</span>
              </div>
              <div className="meta">{evidenceText(r)}</div>
              <div className="meta">状态：{RISK_STATUS_LABEL[r.status] || r.status}</div>
            </div>
          );
          const groups = [];
          for (const r of risks) {
            let g = groups.find((x) => x.type === r.signal_type);
            if (!g) {
              g = { type: r.signal_type, latest: r, count: 0, first: r, anyOpen: false };
              groups.push(g);
            }
            g.count += 1;
            g.first = r; // date DESC, 最后一条即最早
            if (r.status === "open") g.anyOpen = true;
          }
          groups.sort((a, b) => (b.anyOpen ? 1 : 0) - (a.anyOpen ? 1 : 0));
          return (
            <>
              {groups.map((g) =>
                riskCard(g.latest, g.count > 1
                  ? ` · 共 ${g.count} 次（自 ${fmtDate(g.first.date)} 起）`
                  : "")
              )}
              <details className="diary-raw">
                <summary>查看全部 {risks.length} 条原始信号记录</summary>
                {risks.map((r) => riskCard(r))}
              </details>
            </>
          );
        })()}

        <div className="sec-t">近14天群活跃（每日消息数 · 深色为客户发言）</div>
        {Array.isArray(customer.wecom_daily_trend) && customer.wecom_daily_trend.length > 0 ? (
          <DailyTrend trend={customer.wecom_daily_trend} />
        ) : customer.roomid ? (
          <div className="empty">逐日数据今晚构建后展示。</div>
        ) : (
          <div className="empty">该客户未关联企微群。</div>
        )}

        <div className="lineage">数据截至 {fmtDate(customer.updated_at) || fmtDate(customer.as_of_date) || "—"} · 来自 customer_360</div>
        </div>
      </main>
    </>
  );
}

// sub: optional secondary line under the value (e.g. industry2, 合同剩余天数).
// bar: optional 0-100 number -- renders a mini progress bar (e.g. 额度使用); omitted (not 0)
// when there's nothing to show. muted: dims the value for not-yet-wired placeholders (ACOS).

// 亚马逊各站点域名 (LC 2026-08-24: Top5 ASIN 点击直达 product detail page)
const AMZ_TLD = { US:"com", CA:"ca", MX:"com.mx", BR:"com.br", UK:"co.uk", GB:"co.uk",
  DE:"de", FR:"fr", IT:"it", ES:"es", NL:"nl", SE:"se", PL:"pl", BE:"com.be",
  JP:"co.jp", AU:"com.au", SG:"com.sg", AE:"ae", SA:"sa", IN:"in", TR:"com.tr", EG:"eg" };
function amazonUrl(cc, asin) {
  return `https://www.amazon.${AMZ_TLD[(cc || "US").toUpperCase()] || "com"}/dp/${asin}`;
}

function Fact({ label, value, sub, bar, muted }) {
  return (
    <div className="fact">
      <div className="fl">{label}</div>
      <div className={"fv" + (muted ? " muted" : "")}>{value}</div>
      {sub && <div className="fv2">{sub}</div>}
      {bar !== null && bar !== undefined && (
        <div className="fact-bar">
          <i className={bar >= 90 ? "warn" : ""} style={{ width: `${Math.min(100, Math.max(0, bar))}%` }} />
        </div>
      )}
    </div>
  );
}

function VerdictCard({ title, v }) {
  const verdict = v?.verdict;
  return (
    <div className="verdict-card">
      <div className="verdict-title">{title}</div>
      <span className={"tag " + verdictClass(verdict)}>{VERDICT_LABEL[verdict] || "暂无数据"}</span>
      <div className="verdict-evidence">{v?.evidence || "—"}</div>
    </div>
  );
}

function DailyTrend({ trend }) {
  // trend: sparse [{d:'YYYY-MM-DD', all, cust}] from the worker (14d window). Fill the
  // last 14 calendar days (Asia/Shanghai view) so silent days render as visible gaps --
  // the old rolling-7d-sum chart made every bar near-identical (LC: 数据应该是错的).
  const byDay = Object.fromEntries((trend || []).map((t) => [t.d, t]));
  const anchor = new Date(Date.now() + 8 * 3600e3);
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(anchor);
    dt.setUTCDate(anchor.getUTCDate() - i);
    const key = dt.toISOString().slice(0, 10);
    days.push({ d: key, all: byDay[key]?.all || 0, cust: byDay[key]?.cust || 0 });
  }
  const max = Math.max(1, ...days.map((x) => x.all));
  return (
    <div className="dtrend">
      {days.map((x) => (
        <div className="dt-bar" key={x.d} title={`${x.d}：全部 ${x.all} 条 · 客户 ${x.cust} 条`}>
          <span className="dt-n">{x.all > 0 ? x.all : ""}</span>
          <div className="dt-stack">
            <i className="dt-all" style={{ height: `${x.all > 0 ? Math.max(6, (x.all / max) * 64) : 2}px` }}>
              <em className="dt-cust" style={{ height: `${x.all > 0 ? Math.round((x.cust / x.all) * 100) : 0}%` }} />
            </i>
          </div>
          <span className="dt-day">{Number(x.d.slice(8, 10))}日</span>
        </div>
      ))}
    </div>
  );
}