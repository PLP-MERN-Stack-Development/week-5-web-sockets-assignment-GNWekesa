import { useState } from 'react';
import socket from '../socket';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');

  const handleLogin = () => {
    if (username.trim()) {
      socket.emit('user_join', username);
      onLogin(username);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-10">
      <input
        type="text"
        placeholder="Enter your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="border p-2 rounded"
      />
      <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded">
        Join Chat
      </button>
    </div>
  );
}
