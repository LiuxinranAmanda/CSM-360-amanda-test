'use client';

import { useState } from 'react';

export default function Dossier({ md, digest }) {
  return (
    <div className="dossier">
      <div className="dossier-content">
        {md ? (
          <div dangerouslySetInnerHTML={{ __html: md }} />
        ) : (
          <p>档案信息将在完整版本中显示...</p>
        )}
      </div>
      {digest && (
        <div className="daily-digest">
          <h4>每日摘要</h4>
          <div dangerouslySetInnerHTML={{ __html: digest }} />
        </div>
      )}
    </div>
  );
}

export function DiagnosisMd({ diagnosis }) {
  return (
    <div className="diagnosis">
      {diagnosis ? (
        <div dangerouslySetInnerHTML={{ __html: diagnosis }} />
      ) : (
        <p>诊断信息将在完整版本中显示...</p>
      )}
    </div>
  );
}