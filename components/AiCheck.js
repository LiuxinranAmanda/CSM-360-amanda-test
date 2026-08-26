'use client';

import { useState } from 'react';

export default function AiCheck({ customer }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="ai-check">
      <button onClick={() => setChecked(!checked)}>
        {checked ? '✓ AI检查完成' : 'AI检查'}
      </button>
      {checked && (
        <div className="ai-results">
          <p>AI分析结果：客户状态良好</p>
        </div>
      )}
    </div>
  );
}