// 简化版的访问日志功能
export function logVisit(page, userId) {
  // 在演示环境中，我们不需要实际记录访问日志
  console.log(`Visit logged: ${page} by ${userId || 'anonymous'}`);
  return Promise.resolve();
}