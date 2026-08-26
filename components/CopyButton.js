'use client';

import { useState } from 'react';

export default function CopyButton({ text, children }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleClick} className="copy-button">
      {copied ? '✓ 已复制' : children || '复制'}
    </button>
  );
}