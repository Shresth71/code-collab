import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;

  async function handleCreateRoom() {
    if (!username.trim()) return setError('Please enter a username');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/rooms/create`, { method: 'POST' });
      const data = await res.json();
      // Save username to sessionStorage so editor page can access it
      sessionStorage.setItem('username', username);
      router.push(`/editor/${data.roomId}`);
    } catch (err) {
      setError('Failed to create room. Is the server running?');
    }
    setLoading(false);
  }

  async function handleJoinRoom() {
    if (!username.trim()) return setError('Please enter a username');
    if (!roomId.trim()) return setError('Please enter a room ID');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/rooms/join/${roomId}`);
      if (!res.ok) return setError('Room not found. Check the ID and try again.');
      sessionStorage.setItem('username', username);
      router.push(`/editor/${roomId}`);
    } catch (err) {
      setError('Failed to join room. Is the server running?');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">
            Code<span className="text-blue-500">Collab</span>
          </h1>
          <p className="text-gray-400">Real-time collaborative code editor</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-800">

          {/* Username Input */}
          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-2">Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none border border-gray-700 focus:border-blue-500 transition"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading && !showJoin ? 'Creating...' : '+ Create New Room'}
            </button>

            <button
              onClick={() => { setShowJoin(!showJoin); setError(''); }}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition border border-gray-700"
            >
              Join Existing Room
            </button>
          </div>

          {/* Join Room Input — shows when Join is clicked */}
          {showJoin && (
            <div className="mt-4">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none border border-gray-700 focus:border-blue-500 transition mb-3"
              />
              <button
                onClick={handleJoinRoom}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Room →'}
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
          )}
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          No account needed. Just enter your name and start coding.
        </p>
      </div>
    </div>
  );
}