// /src/components/webuild/GovernancePanel.jsx
import React, { useState } from 'react';

const GovernancePanel = ({ state, setState }) => {
  const [proposal, setProposal] = useState('');
  const [votes, setVotes] = useState([]);

  const handleVote = () => {
    if (state.root < 1) {
      alert('You need ROOT tokens to vote.');
      return;
    }
    if (!proposal.trim()) {
      alert('Enter a valid proposal.');
      return;
    }
    setVotes(prev => [...prev, { text: proposal, votes: state.root }]);
    setProposal('');
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">🗳️ Governance Voting</h2>
      <p className="text-sm text-gray-400 mb-2">Vote using ROOT tokens</p>
      <input
        type="text"
        placeholder="Proposal text..."
        value={proposal}
        onChange={e => setProposal(e.target.value)}
        className="p-2 rounded border w-full"
      />
      <button
        onClick={handleVote}
        className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
      >
        Submit Vote
      </button>
      <div className="mt-4">
        {votes.map((v, i) => (
          <div key={i} className="border-b py-1">
            <strong>✔️ {v.votes} ROOT:</strong> {v.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GovernancePanel;