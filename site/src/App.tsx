import { useState, useEffect } from 'react';
import { CONFIG } from './config';
import { fetchRoster } from './data/roster';
import { fetchContributionRecords } from './data/contributionRecords';
// import { fetchCommentsForUser, resolveUid } from './data/drupalApiD7';
// import { fetchMergeRequestDetails } from './data/gitlab';
import { Person, CreditRecord } from './types';
import { aggregateData, getMonthLabels } from './utils';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [credits, setCredits] = useState<CreditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const [months, setMonths] = useState(CONFIG.defaultMonths);
  const [org] = useState(CONFIG.defaultOrg);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setStatus('Fetching roster...');
    try {
      const roster = await fetchRoster();
      setPeople(roster);
      
      setStatus('Fetching contribution credits...');
      const creditRecords = await fetchContributionRecords(org, months, (c) => setStatus(`Fetched ${c} credits...`));
      setCredits(creditRecords);

      // Trigger other fetches (comments, MRs) in parallel or sequence
      // For MVP, just credits
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const monthLabels = getMonthLabels(months);
  const aggregated = aggregateData(credits, [], [], people.map(p => p.username), monthLabels);

  const chartData = {
    labels: monthLabels,
    datasets: [
    useEffect(() => {
      loadSnapshotData();
    }, []);
        borderColor: 'rgb(53, 162, 235)',
    const loadSnapshotData = async () => {
      setLoading(true);
      setStatus('Loading snapshot data...');
      try {
        // Load static JSON files from public/data
        const rosterRes = await fetch('/data/roster.json');
        const roster = await rosterRes.json();
        setPeople(roster);
      
        const creditsRes = await fetch('/data/credits.json');
        const creditRecords = await creditsRes.json();
        setCredits(creditRecords);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
        setStatus('');
      }
    };
          Loading: {status}
        </div>
      )}

      {!loading && !error && (
        <main>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div className="bg-white p-6 rounded-lg shadow">
               <h2 className="text-lg font-semibold mb-4">Contribution Credits (Last {months} Months)</h2>
               <Line options={{ responsive: true }} data={chartData} />
             </div>
             <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4">Top Contributors</h2>
                <ul>
                    {Object.entries(aggregated.byPerson)
                        .sort(([,a], [,b]) => b.credits - a.credits)
                        .slice(0, 10)
                        .map(([user, metrics]) => (
                            <li key={user} className="flex justify-between border-b py-2">
                                <span>{user}</span>
                                <span className="font-mono">{metrics.credits}</span>
                            </li>
                        ))}
                </ul>
             </div>
           </div>
           
           <h2 className="text-xl font-bold mb-4">Roster ({people.length})</h2>
           <div className="flex flex-wrap gap-2">
               {people.map(p => (
                   <a key={p.username} href={p.profileUrl} target="_blank" rel="noopener" 
                      className="bg-gray-200 px-2 py-1 rounded text-sm hover:bg-gray-300">
                      {p.username}
                   </a>
               ))}
           </div>
        </main>
      )}
    </div>
  );
}

export default App;
