'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopBar({ user, active, customer }) {
  const pathname = usePathname();

  return (
    <div className="topbar">
      <div className="tb-l">
        <Link href="/" className="tb-logo">CSM 360</Link>
        {pathname !== '/' && (
          <Link href="/" className="tb-back">← 返回首页</Link>
        )}
      </div>
      <div className="tb-r">
        {customer && <span className="tb-customer">{customer.name}</span>}
        <div className="tb-user">演示用户</div>
      </div>
    </div>
  );
}