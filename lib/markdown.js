// 简化版markdown处理库

export function extractAiConclusion(markdown) {
  if (!markdown) return null;
  // 简化版AI结论提取
  return markdown.substring(0, 100) + '...';
}

export const zhTerms = {
  // 中文术语对照表
  customer: '客户',
  revenue: '收入',
  renewal: '续约',
  risk: '风险',
  satisfaction: '满意度',
  engagement: '参与度',
};