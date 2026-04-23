import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_API_URL, {
  autoConnect: false  // we connect manually when user enters a room
});

export default socket;