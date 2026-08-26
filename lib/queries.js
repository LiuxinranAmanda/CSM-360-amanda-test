// 简化版的查询功能，用于演示目的
export async function getCustomer(id) {
  // 返回模拟的客户数据
  return {
    id: id || 'demo-customer',
    name: 'Demo Customer',
    status: 'active',
    contract_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90天后到期
    account_status: 'Gold',
    active_level: 'High',
    satisfaction: 'Satisfied',
    trajectory: 'Stable',
    risk_status: 'Low Risk',
    last_contact: new Date(),
    next_renewal: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    revenue: 100000,
    owner: 'Demo Owner',
    bd: 'Demo BD',
    csm: 'Demo CSM',
  };
}

export async function customerRiskHistory(id) {
  return [];
}

export async function customerSnapshots(id) {
  return [];
}

export async function getDossier(id) {
  return {};
}

export async function customerLogs(id) {
  return [];
}

export async function listCadenceRules(id) {
  return [];
}

export async function customerJiraTickets(id) {
  return [];
}

export async function customerMonthly(id) {
  return {};
}

// 添加主页需要的函数
export async function portfolioSummary() {
  return {
    total: 100,
    atRisk: 15,
    highValue: 30,
    renewalsThisMonth: 12,
    renewalsNextMonth: 8,
    avgSatisfaction: 4.2,
  };
}

export async function riskCount() {
  return {
    high: 5,
    medium: 10,
    low: 85,
  };
}

export async function metricsTrend() {
  return [
    { date: '2024-01', customers: 95, atRisk: 12 },
    { date: '2024-02', customers: 96, atRisk: 10 },
    { date: '2024-03', customers: 98, atRisk: 8 },
    { date: '2024-04', customers: 99, atRisk: 9 },
    { date: '2024-05', customers: 100, atRisk: 7 },
    { date: '2024-06', customers: 100, atRisk: 6 },
  ];
}

export async function recentComplaintAlerts() {
  return [
    { id: 1, customer: '客户A', issue: '服务延迟', severity: 'high', date: new Date() },
    { id: 2, customer: '客户B', issue: '功能缺陷', severity: 'medium', date: new Date() },
  ];
}

export async function actionQueue() {
  return [
    { id: 1, customer: '客户C', action: '续约跟进', priority: 'high', due: new Date() },
    { id: 2, customer: '客户D', action: '满意度调查', priority: 'medium', due: new Date() },
  ];
}

export async function segmentCounts() {
  return {
    platinum: 10,
    gold: 25,
    silver: 35,
    bronze: 30,
  };
}

export async function segmentTop(segment) {
  return [
    { id: 1, name: '大客户A', value: 100000 },
    { id: 2, name: '大客户B', value: 80000 },
    { id: 3, name: '大客户C', value: 60000 },
  ];
}

export async function getPortfolioBrief() {
  return {
    summary: '整体客户组合状况良好，续约率保持稳定',
    growth: '+5.2%',
    satisfaction: '4.2/5.0',
  };
}

export async function renewalPriorityList() {
  return [
    { id: 1, name: '客户X', value: 150000, renewalDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), risk: 'medium' },
    { id: 2, name: '客户Y', value: 120000, renewalDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), risk: 'high' },
    { id: 3, name: '客户Z', value: 90000, renewalDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), risk: 'low' },
  ];
}

export async function todayChanges() {
  return [
    { id: 1, customer: '客户A', change: '升级套餐', type: 'positive' },
    { id: 2, customer: '客户B', change: '减少服务', type: 'negative' },
  ];
}