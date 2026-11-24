import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then((data) => setEntries(data.leaderboard))
      .catch(() => setError('Unable to load leaderboard'));
  }, []);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Leaderboard</h2>
    <p>Compare team point totals.</p>
    {error ? <p role="alert">{error}</p> :
      entries === null ? <p role="status">Loading leaderboard...</p> :
      entries.length === 0 ? <p>No leaderboard rankings yet.</p> :
      <ol>{entries.map((entry) => <li key={entry.rank}>{entry.teamName}: {entry.totalPoints} points</li>)}</ol>}
  </div></section>;
}
