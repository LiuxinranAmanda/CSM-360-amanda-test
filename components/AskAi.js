'use client';

import { useState } from 'react';

export default function AskAi({ customer, customerId, customerName, inviteScript, dossierConclusion }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // 模拟AI回答
    setAnswer(`关于${customerName || customer?.name || '客户'}的问题"${question}"，目前处于演示模式，暂时无法提供真实AI回答。`);
  };

  return (
    <div className="ask-ai">
      <h3>向AI询问</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="询问关于客户的AI分析..."
        />
        <button type="submit">提问</button>
      </form>
      {answer && <div className="ai-answer">{answer}</div>}
      
      {inviteScript && (
        <div className="invite-script">
          <h4>邀请脚本建议:</h4>
          <p>{inviteScript}</p>
        </div>
      )}
      
      {dossierConclusion && (
        <div className="dossier-conclusion">
          <h4>档案AI结论:</h4>
          <p>{dossierConclusion}</p>
        </div>
      )}
    </div>
  );
}