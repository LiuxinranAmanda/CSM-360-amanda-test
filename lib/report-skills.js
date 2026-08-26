// 简化版报告技能库
export const REPORT_TYPES = {
  executive: { label: '高管报告' },
  renewal: { label: '续约报告' },
  health: { label: '健康度报告' },
  ai: { label: 'AI分析报告' },
};

export function recommendReportType(customer) {
  return 'health';
}

export function recommendFromAction(action) {
  return 'health';
}