import { supabaseAnon } from '../utils/supabaseClient.js';

const { useState, useEffect } = React;
const { createRoot } = ReactDOM;

function App() {
  const [user, setUser] = useState(null);
  const [trains, setTrains] = useState([]);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (!data.user) window.location.href = '/';
        else setUser(data.user);
      });

    fetch('/api/trains')
      .then(r => r.json())
      .then(data => setTrains(data));
  }, []);

  const joinTrain = async (trainId) => {
    await fetch('/api/trains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainId })
    });
    setTrains(trains.map(t => t.id === trainId ? { ...t, crew: [...t.crew, user.username] } : t));
  };

  const tableRows = trains.map(train => (
    <tr key={train.id}>
      <td className="border px-2">{train.name}</td>
      <td className="border px-2">{train.direction}</td>
      <td className="border px-2">{train.crew.join(', ')}</td>
      <td className="border px-2">
        {train.crew.includes(user.username) ? 'Joined' : <button onClick={() => joinTrain(train.id)} className="px-2 py-1 bg-green-600 text-white rounded">Join</button>}
      </td>
    </tr>
  ));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span>Logged in: {user?.username}</span>
      </header>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border px-2">Train</th>
            <th className="border px-2">Direction</th>
            <th className="border px-2">Crew</th>
            <th className="border px-2">Actions</th>
          </tr>
        </thead>
        <tbody>{tableRows}</tbody>
      </table>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
