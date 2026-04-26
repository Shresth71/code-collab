import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import socket from '../../utils/socket';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript', color: 'text-yellow-400', initial: 'JS' },
  { value: 'python', label: 'Python', color: 'text-blue-400', initial: 'Py' },
  { value: 'cpp', label: 'C++', color: 'text-blue-500', initial: 'C++' },
  { value: 'java', label: 'Java', color: 'text-red-500', initial: 'J' },
];

export default function EditorPage() {
  const router = useRouter();
  const { roomId } = router.query;

  const [username, setUsername] = useState('');
  const [users, setUsers] = useState([]);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [myColor, setMyColor] = useState('#4ECDC4');

  const codeRef = useRef('');
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const usernameRef = useRef('');
  const myColorRef = useRef('#4ECDC4');
  const roomIdRef = useRef('');
  const yProviderRef = useRef(null);

  useEffect(() => {
    const savedUsername = sessionStorage.getItem('username');
    if (!savedUsername) { router.push('/'); return; }
    setUsername(savedUsername);
    usernameRef.current = savedUsername;
  }, []);

  useEffect(() => {
    if (!roomId || !username) return;
    roomIdRef.current = roomId;

    socket.connect();
    socket.emit('join-room', { roomId, username });

    socket.on('load-room', ({ code, language, color }) => {
      if (code !== undefined) {
        setCode(code);
        codeRef.current = code;
      }
      if (language) setLanguage(language);
      if (color) {
        setMyColor(color);
        myColorRef.current = color;
        if (yProviderRef.current) {
          yProviderRef.current.awareness.setLocalStateField('user', {
            name: usernameRef.current,
            color: color
          });
        }
      }
    });

    socket.on('room-users', (roomUsers) => {
      setUsers(roomUsers);
    });



    socket.on('language-change', ({ language }) => {
      setLanguage(language);
    });

    socket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });



    return () => {
      if (yProviderRef.current) yProviderRef.current.destroy();
      socket.off('load-room');
      socket.off('room-users');
      socket.off('language-change');
      socket.off('receive-message');
      socket.disconnect();
    };
  }, [roomId, username]);



  // Monaco Editor mounts
  async function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 1. Initialize Yjs
    const ydoc = new Y.Doc();
    
    // 2. Connect to Y-Websocket provider
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/^http/, 'ws') + '/yjs';
    const provider = new WebsocketProvider(wsUrl, roomIdRef.current, ydoc);
    yProviderRef.current = provider;

    // 3. Bind Yjs to Monaco
    const ytext = ydoc.getText('monaco');
    const { MonacoBinding, setMonacoInstance } = await import('../../utils/y-monaco');
    setMonacoInstance(monaco);
    const binding = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness);

    // 4. Set local awareness state for remote cursors
    provider.awareness.setLocalStateField('user', {
      name: usernameRef.current,
      color: myColorRef.current
    });
  }

  function handleCodeChange(value) {
    const newCode = value || '';
    setCode(newCode);
    codeRef.current = newCode;
    socket.emit('save-code', { roomId, code: newCode });
  }

  function handleLanguageChange(lang) {
    setLanguage(lang);
    socket.emit('language-change', { roomId, language: lang });
  }

  // Copy Room ID
  function copyRoomId() {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadCode() {
    const extensions = { javascript: 'js', python: 'py', cpp: 'cpp', java: 'java' };
    const ext = extensions[language] || 'txt';
    const blob = new Blob([codeRef.current], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-${roomId}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sendMessage() {
    if (!newMessage.trim()) return;
    const message = {
      username,
      text: newMessage,
      time: new Date().toLocaleTimeString(),
      color: myColor,
    };
    socket.emit('send-message', { roomId, message });
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  }

  async function runCode() {
    setRunning(true);
    setOutput('Running...');

    const languageIds = {
      javascript: 63, python: 71, cpp: 54, java: 62,
    };

    try {
      const submitRes = await fetch('https://ce.judge0.com/submissions?base64_encoded=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_code: codeRef.current,
          language_id: languageIds[language],
        }),
      });
      const { token } = await submitRes.json();

      let result;
      while (true) {
        const resultRes = await fetch(
          `https://ce.judge0.com/submissions/${token}?base64_encoded=false`
        );
        result = await resultRes.json();
        if (result.status.id > 2) break;
        await new Promise(r => setTimeout(r, 1000));
      }

      setOutput(result.stdout || result.stderr || result.compile_output || 'No output');
    } catch (err) {
      setOutput('Error running code. Try again.');
    }
    setRunning(false);
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">

      {/* Top Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-bold text-lg">
            Code<span className="text-blue-500">Collab</span>
          </h1>

          {/* Room ID and Copy Button */}
          <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-1.5 py-1">
            <span className="text-gray-200 text-sm font-medium tracking-wide">{roomId}</span>
            <button
              onClick={copyRoomId}
              title="Copy Room ID"
              className="text-gray-400 hover:text-white transition flex items-center justify-center hover:bg-gray-700 rounded-md p-1.5"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              )}
            </button>
          </div>

          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="bg-gray-800 text-gray-300 text-sm px-3 py-1.5 rounded-lg border border-gray-700 flex items-center gap-2 hover:bg-gray-700 transition outline-none"
            >
              {(() => {
                const opt = LANGUAGE_OPTIONS.find(o => o.value === language) || LANGUAGE_OPTIONS[0];
                return (
                  <>
                    <span className={`font-bold ${opt.color} w-6 text-center`}>{opt.initial}</span>
                    {opt.label}
                    <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </>
                );
              })()}
            </button>
            
            {dropdownOpen && (
              <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                {LANGUAGE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      handleLanguageChange(opt.value);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-700 transition ${language === opt.value ? 'bg-gray-700/50' : ''}`}
                  >
                    <span className={`font-bold ${opt.color} w-6 text-center`}>{opt.initial}</span>
                    <span className="text-gray-200">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Users with their colors */}
        <div className="flex items-center gap-2">
          {users.map((user, i) => (
            <div
              key={i}
              className="text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5"
              style={{ backgroundColor: user.color }}
            >
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              {user.username}
            </div>
          ))}
          <button
            onClick={() => router.push('/')}
            className="ml-2 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded-lg transition"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor + Output */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              height="100%"
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
              }}
            />
          </div>

          {/* Output */}
          <div className="h-48 bg-gray-900 border-t border-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
              <span className="text-gray-400 text-sm font-medium">Output</span>
              <div className="flex gap-2">
                <button
                  onClick={downloadCode}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-1.5 rounded-lg transition font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </button>
                <button
                  onClick={runCode}
                  disabled={running}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-5 py-1.5 rounded-lg transition font-medium flex items-center gap-2"
                >
                  {running ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Run Code
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-green-400 text-sm font-mono">
              {output || 'Click Run to execute your code...'}
            </pre>
          </div>
        </div>

        {/* Chat */}
        <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <h2 className="text-white font-medium">Chat</h2>
            <span className="text-gray-500 text-xs">({users.length} online)</span>
          </div>

          <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-gray-600 text-sm text-center mt-4">
                No messages yet
              </p>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.username === username;
              return (
                <div
                  key={i}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-gray-500 text-[11px] mb-1 px-1">
                    {isMe ? 'You' : msg.username}
                  </span>
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm text-white max-w-[85%] break-words shadow-sm ${
                      isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
                    }`}
                    style={{ backgroundColor: msg.color || '#374151' }}
                  >
                    {msg.text}
                  </div>
                  <span className="text-gray-600 text-[10px] mt-1 px-1">{msg.time}</span>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-gray-800 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none border border-gray-700 focus:border-blue-500 transition"
            />
            <button
              onClick={sendMessage}
              className="text-white text-sm px-3 py-2 rounded-lg transition font-medium"
              style={{ backgroundColor: myColor }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}