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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)' }}
    >
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative z-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#e2e8f0' }}>
              Code<span style={{ color: '#818cf8' }}>Collab</span>
            </h1>
          </div>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Real-time collaborative code editor
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgba(15, 18, 25, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
          }}
        >

          {/* Username Input */}
          <div className="mb-6">
            <label className="block text-xs font-medium mb-2 tracking-wide uppercase" style={{ color: '#64748b' }}>
              Display Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none text-sm transition-all duration-200 input-glow"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm disabled:opacity-50 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {loading && !showJoin ? 'Creating...' : '+ Create New Room'}
            </button>

            <button
              onClick={() => { setShowJoin(!showJoin); setError(''); }}
              className="w-full text-sm font-semibold py-3 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/[0.06] active:scale-[0.98]"
              style={{
                color: '#94a3b8',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
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
                className="w-full rounded-xl px-4 py-3 outline-none text-sm transition-all duration-200 mb-3 input-glow"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(34, 197, 94, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
              />
              <button
                onClick={handleJoinRoom}
                disabled={loading}
                className="w-full text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm disabled:opacity-50 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
              >
                {loading ? 'Joining...' : 'Join Room →'}
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 text-sm text-center py-2 px-3 rounded-lg"
              style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)' }}
            >
              {error}
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#475569' }}>
          No account needed — just enter your name and start coding.
        </p>
      </div>
    </div>
  );
}