import { useState } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';

function App() {
  const [username, setUsername] = useState('');

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {!username ? (
        <Login onLogin={(name) => setUsername(name)} />
      ) : (
        <Chat username={username} />
      )}
    </div>
  );
}

export default App;
