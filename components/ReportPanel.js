'use client';

import { useState } from 'react';

export default function ReportPanel({ customer }) {
  const [reportType, setReportType] = useState('health');

  return (
    <div className="report-panel">
      <h3>报告面板</h3>
      <div className="report-controls">
        <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
          <option value="health">健康度报告</option>
          <option value="renewal">续约报告</option>
          <option value="executive">高管报告</option>
          <option value="ai">AI分析报告</option>
        </select>
        <button>生成报告</button>
      </div>
      <div className="report-preview">
        <p>选择报告类型并点击"生成报告"按钮以查看{customer?.name || '客户'}的详细分析报告。</p>
      </div>
    </div>
  );
}