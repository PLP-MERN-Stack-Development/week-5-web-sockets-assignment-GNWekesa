// 📁 client/src/components/Chat.jsx
import { useEffect, useState } from 'react';
import socket from '../socket';

export default function Chat({ username }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [activePrivate, setActivePrivate] = useState(null);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const notificationSound = new Audio('/notify.mp3');

  const showBrowserNotification = (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  };

  const loadMessages = async () => {
    if (!hasMoreMessages) return;
    setLoadingEarlier(true);
    try {
      const res = await fetch(`/api/messages?limit=${limit}&offset=${offset}`);
      const data = await res.json();
      if (data.length === 0) {
        setHasMoreMessages(false);
      } else {
        setMessages((prev) => [...data.reverse(), ...prev]);
        setOffset(offset + data.length);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
    setLoadingEarlier(false);
  };

  useEffect(() => {
    loadMessages();

    socket.on('receive_message', (msg) => {
      if (!msg.isPrivate || msg.senderId === socket.id || msg.senderId === activePrivate?.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on('typing_users', (users) => {
      setTypingUsers(users.filter((u) => u !== username));
    });

    socket.on('user_list', (userList) => {
      setUsers(userList);
    });

    socket.on('user_joined', ({ username }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'System',
          message: `${username} joined the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    socket.on('user_left', ({ username }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'System',
          message: `${username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    socket.on('private_message', (msg) => {
      if (!msg) return;
      setMessages((prev) => [...prev, msg]);
      notificationSound.play();
      if (!activePrivate || activePrivate.id !== msg.senderId) {
        alert(`New private message from ${msg.sender}`);
        showBrowserNotification(`Private message from ${msg.sender}`, msg.message);
      }
    });

    socket.on('connect', () => console.log('Connected'));
    socket.on('disconnect', () => console.log('Disconnected'));
    socket.on('reconnect', () => console.log('Reconnected'));

    return () => {
      socket.off('receive_message');
      socket.off('typing_users');
      socket.off('user_list');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('private_message');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect');
    };
  }, [activePrivate, username]);

  const sendMessage = () => {
    if (message.trim()) {
      if (activePrivate) {
        socket.emit('private_message', { to: activePrivate.id, message });
      } else {
        socket.emit('send_message', { message }, () => {
          console.log('Message delivered');
        });
      }
      setMessage('');
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', e.target.value.length > 0);
  };

  return (
    <div className="flex max-w-6xl mx-auto mt-8 gap-4">
      {/* Sidebar with online users */}
      <div className="w-1/4 border rounded p-4 bg-gray-50">
        <h2 className="text-lg font-bold mb-2">Online Users</h2>
        {users
          .filter((u) => u.username !== username)
          .map((user) => (
            <div
              key={user.id}
              className={`cursor-pointer px-2 py-1 rounded hover:bg-blue-100 ${
                activePrivate?.id === user.id ? 'bg-blue-200' : ''
              }`}
              onClick={() => {
                setMessages([]);
                setActivePrivate(user);
              }}
            >
              {user.username}
            </div>
          ))}
        <button
          onClick={() => {
            setActivePrivate(null);
            setMessages([]);
          }}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Switch to global chat
        </button>
      </div>

      {/* Main chat section */}
      <div className="flex flex-col w-3/4">
        <input
          type="text"
          placeholder="Search messages..."
          className="border p-1 mb-2 rounded w-full"
          onChange={(e) => {
            const keyword = e.target.value.toLowerCase();
            setMessages((prev) =>
              prev.filter(
                (msg) =>
                  msg.message.toLowerCase().includes(keyword) ||
                  msg.sender.toLowerCase().includes(keyword)
              )
            );
          }}
        />

        <div
          className="border p-4 h-80 overflow-y-scroll bg-gray-100 rounded"
          onScroll={(e) => {
            if (e.target.scrollTop === 0 && !loadingEarlier) {
              loadMessages();
            }
          }}
        >
          {loadingEarlier && <div className="text-sm text-gray-500 mb-2">Loading earlier messages...</div>}
          {messages.map((msg) => (
            <div key={msg.id} className="mb-2">
              <strong>
                {msg.sender}{' '}
                {msg.isPrivate && <span className="text-xs text-red-500">(private)</span>}
              </strong>
              : {msg.message}
              <div className="text-xs text-gray-500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-600">{typingUsers.join(', ')} typing...</div>
        )}

        <div className="flex gap-2 mt-4">
          <input
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="border p-2 flex-grow rounded"
          />
          <button onClick={sendMessage} className="bg-green-500 text-white px-4 rounded">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
