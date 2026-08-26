// 格式化函数库

export const STATUS_LABEL = {
  active: '活跃',
  inactive: '非活跃',
  pending: '待定',
};

export const ACCOUNT_STATUS_LABEL = {
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
};

export const ACTIVE_LEVEL_LABEL = {
  low: '低',
  medium: '中',
  high: '高',
};

export const SEVERITY_LABEL = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};

export const SIGNAL_LABEL = {
  positive: '积极',
  negative: '消极',
  neutral: '中性',
};

export const SATISFACTION_LABEL = {
  unsatisfied: '不满意',
  satisfied: '满意',
  very_satisfied: '非常满意',
};

export const TRAJECTORY_LABEL = {
  declining: '下降',
  stable: '稳定',
  improving: '改善',
};

export const RISK_STATUS_LABEL = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export const VERDICT_LABEL = {
  positive: '积极',
  negative: '消极',
  neutral: '中性',
};

export const STAGE_LABEL = {
  prospect: '潜在客户',
  trial: '试用期',
  active: '活跃客户',
  renewing: '续约期',
  churned: '流失',
};

// 添加缺失的导出
export const SEGMENT_ORDER = [
  'platinum', 'gold', 'silver', 'bronze'
];

export const RISK_TYPE_LABEL = {
  financial: '财务风险',
  technical: '技术风险',
  relationship: '关系风险',
  competitive: '竞争风险',
};

export const pushBadgeInfo = (info) => {
  // 简单的推送徽章信息函数
  return info || {};
};

export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('zh-CN');
  } catch (e) {
    console.error('Error formatting date:', e);
    return '—';
  }
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleString('zh-CN');
  } catch (e) {
    console.error('Error formatting datetime:', e);
    return '—';
  }
}

export function fmtPct(value) {
  if (typeof value !== 'number') return '—';
  try {
    return `${(value * 100).toFixed(1)}%`;
  } catch (e) {
    console.error('Error formatting percentage:', e);
    return '—';
  }
}

export function fmtNum(num) {
  if (typeof num !== 'number' || isNaN(num)) return '—';
  try {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  } catch (e) {
    console.error('Error formatting number:', e);
    return '—';
  }
}

export function fmtRatioPct(ratio) {
  if (typeof ratio !== 'number' || isNaN(ratio)) return '—';
  try {
    return `${Math.round(ratio * 100)}%`;
  } catch (e) {
    console.error('Error formatting ratio percentage:', e);
    return '—';
  }
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const diffTime = date - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    console.error('Error calculating days until:', e);
    return null;
  }
}

export function statusTagClass(status) {
  return `status-${status || 'unknown'}`;
}

export function sevTagClass(severity) {
  return `sev-${severity || 'unknown'}`;
}

export function evidenceText(signal) {
  return signal || '—';
}

export function segmentBadgeClass(segment) {
  return `seg-${segment || 'unknown'}`;
}

export function timingClass(timing) {
  return `timing-${timing || 'unknown'}`;
}

export function verdictClass(verdict) {
  return `verdict-${verdict || 'unknown'}`;
}

export function evalTagChips(tags) {
  return tags || [];
}

export function cadenceStageOf(stage) {
  return stage || 'unknown';
}