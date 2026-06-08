import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type SocketStatus = "connected" | "disconnected" | "reconnecting";

interface SocketContextValue {
  socket: Socket | null;
  status: SocketStatus;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, status: "disconnected" });

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5005/api";
const SOCKET_URL   = API_BASE_URL.replace("/api", "");

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<SocketStatus>("disconnected");

  if (!socketRef.current) {
    socketRef.current = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }

  // Authenticate with server whenever socket connects/reconnects
  const authenticate = (sock: Socket) => {
    const token = localStorage.getItem("kore_token");
    if (token) sock.emit("authenticate", token);
  };

  useEffect(() => {
    const sock = socketRef.current!;

    const onConnect = () => {
      setStatus("connected");
      authenticate(sock);
    };
    const onDisconnect = () => setStatus("disconnected");
    const onReconnecting = () => setStatus("reconnecting");
    const onReconnected = () => {
      setStatus("connected");
      authenticate(sock);
    };

    sock.on("connect",          onConnect);
    sock.on("disconnect",       onDisconnect);
    sock.on("reconnect_attempt", onReconnecting);
    sock.on("reconnect",        onReconnected);

    // If already connected on mount (StrictMode double-invoke)
    if (sock.connected) {
      setStatus("connected");
      authenticate(sock);
    }

    return () => {
      sock.off("connect",           onConnect);
      sock.off("disconnect",        onDisconnect);
      sock.off("reconnect_attempt", onReconnecting);
      sock.off("reconnect",         onReconnected);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, status }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket     = (): Socket | null        => useContext(SocketContext).socket;
export const useSocketStatus = (): SocketStatus       => useContext(SocketContext).status;
