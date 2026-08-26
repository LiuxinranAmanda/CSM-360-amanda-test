import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { readSession, SESSION_COOKIE, canSeeAll } from "@/lib/session";
import { logVisit } from "@/lib/visit";
import {
  portfolioSummary, riskCount, metricsTrend,
  recentComplaintAlerts, actionQueue, segmentCounts, segmentTop, getPortfolioBrief,
  renewalPriorityList, todayChanges,
} from "@/lib/queries";
import TopBar from "@/components/TopBar";
import RenewalBadge from "@/components/RenewalBadge";
import {
  SEVERITY_LABEL, RISK_TYPE_LABEL,
  fmtDate, fmtDateTime, fmtPct, sevTagClass,
  pushBadgeInfo, daysUntil, segmentBadgeClass, timingClass, SEGMENT_ORDER,
} from "@/lib/format";

const RENEWAL_TARGET = 40;
const EXPIRY_WINDOW_DAYS = 60;
const ACTION_QUEUE_LIMIT = 12;

export default async function PortfolioPage({ searchParams }) {
  const session = await readSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  const isAdmin = canSeeAll(session.role); // admin + viewer 都看全部客户
  const isViewer = session.role === "viewer";
  const isAcsm = session.role === "acsm";
  // ACSM (受托范围, LC 2026-07-20): 首页组合数据按 session.tpids(被委托的CSM们)聚合;
  // 其他角色保持原样(AL 首页仍是自己的盘,整队看团队视图)。
  const pid = isAcsm && session.tpids?.length ? session.tpids : session.pid;
  await logVisit(session, "/");
  const rpFilter = ["quota", "expiry"].includes(searchParams?.rp) ? searchParams.rp : null;

  const [summary, openRisk, trend, alerts, actionQ, segCounts, segTop, brief, renewalPriority, changes] = await Promise.all([
    portfolioSummary(pid, isAdmin),
    riskCount(pid, isAdmin),
    metricsTrend(pid, isAdmin, 14),
    recentComplaintAlerts(pid, isAdmin),
    actionQueue(pid, isAdmin, ACTION_QUEUE_LIMIT),
    segmentCounts(pid, isAdmin),
    segmentTop(pid, isAdmin),
    getPortfolioBrief(session.pid, isAdmin), // 速览按个人scope键存,ACSM暂无(优雅隐藏)
    renewalPriorityList(pid, isAdmin, 20, rpFilter),
    todayChanges(pid, isAdmin),
  ]);

  const prior = priorTrendRow(trend, summary.asOfDate);
  const l1Delta = delta(summary.l1Pct, prior?.l1_pct);
  const renewalDelta = delta(summary.renewalRate, prior?.renewal_rate);
  const renewalOk = summary.renewalRate != null && summary.renewalRate >= RENEWAL_TARGET;

  return (
    <>
      <TopBar session={session} active="home" />
      <main className="page">
        <div className="head">
          <div>
            <h1>{isAdmin ? "全部客户组合" : "我的客户组合"}</h1>
            <div className="sub">{session.name}{isViewer ? " · 只读视图（全部客户）" : isAdmin ? " · 管理员视图（全部 CSM）" : isAcsm ? " · ACSM（受托客户范围）" : " · CSM"}</div>
          </div>
          <div className="chips" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <form className="searchform" action="/customers" method="GET">
              <input type="text" name="q" placeholder="搜索客户名称…" aria-label="搜索客户" />
              <button type="submit" className="btn">搜索</button>
            </form>
            <span className="chip">共 {summary.total} 家客户</span>
          </div>
        </div>

        {(brief?.lines_json?.length || brief?.content_md) && (
          <div className="brief-card">
            <div className="brief-head">📋 今日组合速览（AI）<span className="meta">{fmtDate(brief.date)}</span></div>
            <div className="brief-body">
              {Array.isArray(brief.lines_json) && brief.lines_json.length > 0
                ? brief.lines_json.map((l, i) =>
                    l.why ? (
                      <details className="brief-line brief-line-exp" key={i}>
                        <summary>{renderBriefLine((l.action || "").replace(/^•\s*/, ""))}</summary>
                        <div className="brief-why">{l.why}</div>
                      </details>
                    ) : (
                      <div className="brief-line" key={i}>{renderBriefLine((l.action || "").replace(/^•\s*/, ""))}</div>
                    )
                  )
                : brief.content_md.split("\n").filter(Boolean).map((line, i) => (
                    <div className="brief-line" key={i}>{renderBriefLine(line.replace(/^•\s*/, ""))}</div>
                  ))}
            </div>
          </div>
        )}

        {changes.length > 0 && (
          <section className="changes-board">
            <div className="changes-head">
              <span className="changes-title">📉 今日新进 / 恶化</span>
              <span className="chip">{changes.length} 家（较上次评估）</span>
            </div>
            <div className="changes-grid">
              {changes.slice(0, 12).map((c) => (
                <Link href={`/customer/${c.id}`} className="change-chip" key={c.id}>
                  <span className="change-nm">{c.name}</span>
                  <span className="change-flow">
                    <span className="change-old">{c.oldSeg}</span>
                    <span className="change-arrow">→</span>
                    <span className={"change-new tag " + (c.newRisk ? "seg-risk" : "t-med")}>{c.newSeg}</span>
                  </span>
                  {c.newRisk && <span className="change-badge">新进风险</span>}
                </Link>
              ))}
            </div>
            {changes.length > 12 && <div className="meta" style={{ marginTop: 8 }}>另有 {changes.length - 12} 家恶化，见客户汇总</div>}
          </section>
        )}

        {alerts.length > 0 && (
          <section className="alert-board">
            <div className="alert-head">
              <span className="alert-title">🚨 实时客诉报警</span>
              <span className="chip">近7天 {alerts.length} 条</span>
            </div>
            <div className="alertlist">
              {alerts.map((a) => {
                const badge = pushBadgeInfo(a.pushed_to);
                return (
                  <div className="alertcard" key={a.id}>
                    <div className="r1">
                      <Link href={`/customer/${a.customer_id}`} className="nm">{a.customer_name}</Link>
                      <span className={"tag " + sevTagClass(a.severity)}>{SEVERITY_LABEL[a.severity] || a.severity}</span>
                    </div>
                    <div className="alertquote">「{a.quote}」</div>
                    {a.reply_suggestion && (
                      <details className="alertreply">
                        <summary>建议回复话术</summary>
                        <div className="alertreplybody">{a.reply_suggestion}</div>
                      </details>
                    )}
                    <div className="alertmeta">
                      <span>{fmtDateTime(a.created_at)}</span>
                      <span className={"tag " + badge.cls}>{badge.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="cockpit-queue">
          <div className="cockpit-head">
            <span className="cockpit-title">📋 今日行动队列</span>
            <span className="chip">共 {actionQ.total} 项</span>
          </div>
          {actionQ.items.length === 0 ? (
            <div className="empty">暂无待办——今晚评估引擎跑完后生成。</div>
          ) : (
            <div className="action-grid">
              {actionQ.items.map((c) => {
                const na = c.next_action || {};
                return (
                  <div className="action-card" key={c.id}>
                    <div className="action-top">
                      <Link href={`/customer/${c.id}`} className="nm">{c.name}</Link>
                      <span className={"tag seg-tag " + segmentBadgeClass(c.segment)}>{c.segment || "未分类"}</span>
                    </div>
                    <div className="action-type">{na.type || "—"}</div>
                    {na.reason && <div className="action-reason">{na.reason}</div>}
                    {na.goal && <div className="action-goal">🎯 {na.goal}</div>}
                    {c.segment_reason && <div className="action-segreason">{c.segment_reason}</div>}
                    <div className="action-bottom">
                      <span className={"tag " + timingClass(na.timing)}>{na.timing || "—"}</span>
                      <RenewalBadge value={c.renewal_prob} />
                      <Link href={`/customer/${c.id}`} className="action-link">查看档案 →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="sec-t">客户分层</div>
        <div className="kanban-grid">
          {SEGMENT_ORDER.map((s) => {
            const top3 = segTop[s] || [];
            return (
              <Link href={`/customers?seg=${encodeURIComponent(s)}`} className={"kanban-col " + segmentBadgeClass(s)} key={s}>
                <div className="kanban-col-head">
                  <span className="kanban-col-label">{s}</span>
                  <span className="kanban-col-count">{segCounts[s] || 0}</span>
                </div>
                <div className="kanban-mini-list">
                  {top3.length === 0 ? (
                    <div className="kanban-empty">暂无</div>
                  ) : (
                    top3.map((c) => (
                      <div className="kanban-mini-card" key={c.id}>
                        <div className="kmc-name">{c.name}</div>
                        <div className="kmc-reason">{c.segment_reason || "—"}</div>
                      </div>
                    ))
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        {segCounts.unclassified > 0 && (
          <div className="kanban-note">另有 {segCounts.unclassified} 家客户尚未生成分层评估，今晚评估引擎跑完后显示。</div>
        )}
        {isAdmin && segCounts.unmanaged > 0 && (
          <div className="kanban-note">
            ⚠️ <Link href={`/customers?seg=${encodeURIComponent("无人管")}`}>{segCounts.unmanaged} 家客户当前无人管</Link>
            （原 CSM 已离职或未分配），需要重新分配。
          </div>
        )}

        <div className="metrics3">
          <div className="mcard">
            <div className="mtitle">L1 占比（北极星）</div>
            <div className="bignum">{fmtPct(summary.l1Pct)}</div>
            <Delta value={l1Delta} />
            <div className="distbar">
              <i className="seg t-l1" style={{ flexGrow: summary.l1Count || 0 }} title={`L1 ${summary.l1Count}`} />
              <i className="seg t-l2" style={{ flexGrow: summary.l2Count || 0 }} title={`L2 ${summary.l2Count}`} />
              <i className="seg t-l3" style={{ flexGrow: summary.l3Count || 0 }} title={`L3 ${summary.l3Count}`} />
              <i className="seg t-l4" style={{ flexGrow: summary.l4Count || 0 }} title={`L4 ${summary.l4Count}`} />
            </div>
            <div className="distlegend">
              <span><i className="dot l1" />L1 {summary.l1Count}</span>
              <span><i className="dot l2" />L2 {summary.l2Count}</span>
              <span><i className="dot l3" />L3 {summary.l3Count}</span>
              <span><i className="dot l4" />L4 {summary.l4Count}</span>
            </div>
          </div>

          <div className={"mcard tg " + (renewalOk ? "good" : "warn")}>
            <div className="mtitle">续约率</div>
            <div className="bignum">{fmtPct(summary.renewalRate)}</div>
            <Delta value={renewalDelta} />
            <div className="tgbar">
              <i style={{ width: `${Math.min(100, summary.renewalRate || 0)}%` }} />
              <span className="tgmark" style={{ left: `${RENEWAL_TARGET}%` }} title={`目标 ${RENEWAL_TARGET}%`} />
            </div>
            <div className="tgfoot">
              <span>
                {summary.renewalDen > 0
                  ? `今年到期合同 ${summary.renewalDen} 份 · 已新签 ${summary.renewalNum} 份`
                  : "今晚从 CRM 合同表计算"}
              </span>
              <span>目标 {RENEWAL_TARGET}%</span>
            </div>
          </div>

          <div className="mcard">
            <div className="mtitle">风险客户</div>
            <div className={"bignum" + ((segCounts?.["风险"] || 0) > 0 ? " warn" : "")}>{segCounts?.["风险"] ?? "—"}</div>
            <div className="delta neutral">
              AI 分层为「风险」的客户 · 近14天开放信号 {openRisk.flags} 条 / {openRisk.customers} 家
            </div>
          </div>
        </div>

        {/* 新增: 快速操作面板 */}
        <section className="quick-actions">
          <div className="qah-head">
            <span className="qah-title">⚡ 快速操作</span>
          </div>
          <div className="qah-grid">
            <Link href="/customers" className="qah-item">
              <div className="qah-icon">👥</div>
              <div className="qah-text">查看全部客户</div>
            </Link>
            <Link href="/settings" className="qah-item">
              <div className="qah-icon">⚙️</div>
              <div className="qah-text">系统设置</div>
            </Link>
            <Link href="/tools" className="qah-item">
              <div className="qah-icon">🛠️</div>
              <div className="qah-text">工具箱</div>
            </Link>
            <Link href="/reports" className="qah-item">
              <div className="qah-icon">📊</div>
              <div className="qah-text">报表中心</div>
            </Link>
          </div>
        </section>

        <section className="expiry-board">
          <div className="expiry-head">
            <span className="expiry-title">🎯 续约优先池（额度将尽 / 合同将到期）</span>
            <span className="chip">
              {renewalPriority.length > 0 ? `${renewalPriority[0].total_n} 家客户` : "0 家客户"}
              {renewalPriority.length > 0 && Number(renewalPriority[0].total_n) > renewalPriority.length ? ` · 显示前 ${renewalPriority.length}` : ""}
            </span>
            {renewalPriority.length > 0 && Number(renewalPriority[0].total_n) > renewalPriority.length && (
              <Link className="btn" href={rpFilter === "quota" ? "/customers?quota=hot" : "/customers?expiring=60"} style={{ marginLeft: "auto" }}>
                查看全部 →
              </Link>
            )}
          </div>
          <div className="segchips" style={{ marginBottom: 12 }}>
            <Link href="/" className={"segchip" + (!rpFilter ? " on" : "")}>全部</Link>
            <Link href="/?rp=quota" className={"segchip seg-risk" + (rpFilter === "quota" ? " on" : "")}>额度马上用完</Link>
            <Link href="/?rp=expiry" className={"segchip seg-unknown" + (rpFilter === "expiry" ? " on" : "")}>时间马上到期</Link>
          </div>
          {renewalPriority.length === 0 ? (
            <div className="empty">暂无额度将尽或60天内到期的客户。</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>客户</th>
                  <th>优先原因</th>
                  <th className="r">剩余额度</th>
                  <th className="r">预计用完</th>
                  <th>合同到期</th>
                  <th>风险评估</th>
                  {isAdmin && <th>CSM</th>}
                </tr>
              </thead>
              <tbody>
                {renewalPriority.map((c) => {
                  const days = daysUntil(c.contract_end);
                  return (
                    <tr key={c.id}>
                      <td><Link href={`/customer/${c.id}`}>{c.name}</Link></td>
                      <td>
                        <span className="flagchips">
                          {c.reasons.map((rs, i) => (
                            <span key={i} className={"tag " + (rs.includes("用完") ? "seg-risk" : "t-med")}>{rs}</span>
                          ))}
                        </span>
                      </td>
                      <td className={"r" + (c.remaining != null && c.remaining <= 0 ? " warnnum" : "")}>
                        {c.remaining == null ? "—" : c.remaining <= 0 ? "已用完" : fmtMoney(c.remaining)}
                      </td>
                      <td className={"r" + (c.daysToBurn !== null && c.daysToBurn <= 14 ? " warnnum" : "")}>
                        {c.daysToBurn === null ? "—" : c.daysToBurn === 0 ? "已用完" : `约 ${c.daysToBurn} 天`}
                      </td>
                      <td>{fmtDate(c.contract_end) || "—"}{days !== null ? `（${days} 天）` : ""}</td>
                      <td>
                        <div className="rp-riskcell">
                          <span className="rp-riskseg">
                            {c.segment ? <span className={"tag " + segmentBadgeClass(c.segment)}>{c.segment}</span> : "—"}
                            {c.renewal_prob != null ? <span className="meta" style={{ marginLeft: 6 }}>续约{c.renewal_prob}%</span> : null}
                          </span>
                          {Array.isArray(c.risk_flags) && c.risk_flags.length > 0 && <FlagChips flags={c.risk_flags} />}
                        </div>
                      </td>
                      {isAdmin && <td style={{ whiteSpace: "nowrap" }}>{c.csm_name || "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <div className="lineage">
          数据截至 {fmtDate(summary.asOfDate) || "—"} · 来自 customer_360（每日重建） ·{" "}
          <Link href="/customers">查看全部客户汇总 →</Link>
        </div>
      </main>
    </>
  );
}

// 近14天 open 风险信号 chips(前4平铺,余下 details 原位展开)——到期表与额度板块共用。
function FlagChips({ flags }) {
  if (!Array.isArray(flags) || flags.length === 0) return "—";
  const chip = (f, i) => (
    <span key={i} className={"tag " + (f.s === "high" ? "seg-risk" : f.s === "medium" ? "t-med" : "t-neutral")}>
      {RISK_TYPE_LABEL[f.t] || f.t}
    </span>
  );
  return (
    <span className="flagchips">
      {flags.slice(0, 4).map(chip)}
      {flags.length > 4 && (
        <details className="flagmore">
          <summary>+{flags.length - 4}</summary>
          <span className="flagchips">{flags.slice(4).map(chip)}</span>
        </details>
      )}
    </span>
  );
}

// 速览行内的 [文字↗](/customer/id) markdown 跳转链接 → clickable (Amanda 2026-07-15)
function renderBriefLine(line) {
  const parts = [];
  const re = /\[([^\]]+)\]\((\/customer\/[^)]+)\)/g;
  let last = 0, m;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    parts.push(<Link key={m.index} href={m[2]} className="brief-jump">{m[1]}</Link>);
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts.length ? parts : line;
}

function fmtMoney(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function Delta({ value, suffix = "pt" }) {
  if (value === null || value === undefined) return <div className="delta neutral">— 暂无上期数据</div>;
  if (value === 0) return <div className="delta neutral">与上期持平</div>;
  const up = value > 0;
  return (
    <div className={"delta " + (up ? "good" : "warn")}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}{suffix} vs 上期
    </div>
  );
}

// "上期" = the most recent csm_daily_metrics row that isn't today's as_of_date.
function priorTrendRow(trend, asOfDate) {
  if (!trend?.length) return null;
  const asOfStr = fmtDate(asOfDate);
  const priorRows = trend.filter((r) => fmtDate(r.date) !== asOfStr);
  return priorRows.length ? priorRows[priorRows.length - 1] : null;
}

function delta(cur, prior) {
  if (cur === null || cur === undefined || prior === null || prior === undefined) return null;
  return Math.round((Number(cur) - Number(prior)) * 10) / 10;
}
