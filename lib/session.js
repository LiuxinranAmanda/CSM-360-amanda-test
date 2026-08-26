// 简化版的 session 处理
export function readSession() {
  // 返回模拟的会话数据
  return {
    user: {
      id: 'mock-user-id',
      name: 'Demo User',
      role: 'admin',
    },
    isLoggedIn: true,
  };
}

export const SESSION_COOKIE = 'session';

export function canSeeAll() {
  // 默认允许查看所有内容用于演示
  return true;
}