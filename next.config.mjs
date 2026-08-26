/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 output: 'export' 因为动态路由无法导出静态网站
  // 用于Vercel部署
};

export default nextConfig;