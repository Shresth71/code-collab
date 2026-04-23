import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import socket from '../../utils/socket';

// Monaco editor must be loaded dynamically (no SSR)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGES = ['javascript', 'python', 'cpp', 'java'];

export default function EditorPage() {
    const router = useRouter();
    const { roomId } = router.query;

    const [username, setUsername] = useState('');
    const [users, setUsers] = useState([]);
    const [code, setCode] = useState('// Start coding here...');
    const [language, setLanguage] = useState('javascript');
    const [output, setOutput] = useState('');
    const [running, setRunning] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [copied, setCopied] = useState(false);
    const codeRef = useRef(code);

    // Get username from sessionStorage
    useEffect(() => {
        const savedUsername = sessionStorage.getItem('username');
        if (!savedUsername) {
            router.push('/');
            return;
        }
        setUsername(savedUsername);
    }, []);

    // Connect socket and join room
    useEffect(() => {
        if (!roomId || !username) return;

        socket.connect();
        socket.emit('join-room', { roomId, username });

        // Listen for room users update
        socket.on('room-users', (roomUsers) => {
            setUsers(roomUsers);
        });

        // Listen for code changes from others
        socket.on('code-change', ({ code }) => {
            setCode(code);
            codeRef.current = code;
        });

        // Listen for language changes from others
        socket.on('language-change', ({ language }) => {
            setLanguage(language);
        });

        // Listen for chat messages
        socket.on('receive-message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        return () => {
            socket.disconnect();
        };
    }, [roomId, username]);

    // When user types in editor
    function handleCodeChange(value) {
        setCode(value);
        codeRef.current = value;
        socket.emit('code-change', { roomId, code: value });
    }

    // When user changes language
    function handleLanguageChange(e) {
        const lang = e.target.value;
        setLanguage(lang);
        socket.emit('language-change', { roomId, language: lang });
    }

    // Copy room ID
    function copyRoomId() {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    // Send chat message
    function sendMessage() {
        if (!newMessage.trim()) return;
        const message = { username, text: newMessage, time: new Date().toLocaleTimeString() };
        socket.emit('send-message', { roomId, message });
        setMessages(prev => [...prev, message]);
        setNewMessage('');
    }

    // Run code via Judge0
    async function runCode() {
        setRunning(true);
        setOutput('Running...');

        const languageIds = {
            javascript: 63,
            python: 71,
            cpp: 54,
            java: 62,
        };

        try {
            // Submit code
            const submitRes = await fetch('https://ce.judge0.com/submissions?base64_encoded=false', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_code: codeRef.current,
                    language_id: languageIds[language],
                }),
            });
            const { token } = await submitRes.json();

            // Poll for result
            let result;
            while (true) {
                const resultRes = await fetch(`https://ce.judge0.com/submissions/${token}?base64_encoded=false`);
                result = await resultRes.json();
                if (result.status.id > 2) break; // 1=queued, 2=running, 3+=done
                await new Promise(r => setTimeout(r, 1000)); // wait 1 second
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
                    <h1 className="text-white font-bold text-lg">Code<span className="text-blue-500">Collab</span></h1>

                    {/* Room ID */}
                    <button
                        onClick={copyRoomId}
                        className="bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
                    >
                        Room: {roomId}
                        <span className="text-xs text-blue-400">{copied ? 'Copied!' : 'Copy'}</span>
                    </button>

                    {/* Language Selector */}
                    <select
                        value={language}
                        onChange={handleLanguageChange}
                        className="bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-lg border border-gray-700 outline-none"
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>

                {/* Users in room */}
                <div className="flex items-center gap-2">
                    {users.map((user, i) => (
                        <div
                            key={i}
                            className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full"
                        >
                            {user.username}
                        </div>
                    ))}
                    <button
                        onClick={() => router.push('/')}
                        className="ml-4 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded-lg transition"
                    >
                        Leave
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left — Editor + Output */}
                <div className="flex flex-col flex-1 overflow-hidden">

                    {/* Monaco Editor */}
                    <div className="flex-1 overflow-hidden">
                        <MonacoEditor
                            height="100%"
                            language={language === 'cpp' ? 'cpp' : language}
                            value={code}
                            onChange={handleCodeChange}
                            theme="vs-dark"
                            options={{
                                fontSize: 14,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                automaticLayout: true,
                            }}
                        />
                    </div>

                    {/* Output Panel */}
                    <div className="h-48 bg-gray-900 border-t border-gray-800 flex flex-col">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                            <span className="text-gray-400 text-sm font-medium">Output</span>
                            <button
                                onClick={runCode}
                                disabled={running}
                                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1 rounded-lg transition disabled:opacity-50"
                            >
                                {running ? 'Running...' : '▶ Run'}
                            </button>
                        </div>
                        <pre className="flex-1 overflow-auto p-4 text-green-400 text-sm font-mono">
                            {output || 'Click Run to execute your code...'}
                        </pre>
                    </div>
                </div>

                {/* Right — Chat */}
                <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-800">
                        <h2 className="text-white font-medium">Chat</h2>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
                        {messages.length === 0 && (
                            <p className="text-gray-600 text-sm text-center mt-4">No messages yet</p>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}>
                                <span className="text-gray-500 text-xs mb-1">{msg.username}</span>
                                <div className={`px-3 py-2 rounded-lg text-sm text-white max-w-full break-words ${msg.username === username ? 'bg-blue-600' : 'bg-gray-800'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t border-gray-800 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none border border-gray-700 focus:border-blue-500"
                        />
                        <button
                            onClick={sendMessage}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition text-sm"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}