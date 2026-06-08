import React from "react";
import { useSocketStatus } from "../../context/SocketContext";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

const SocketStatusBadge: React.FC = () => {
  const status = useSocketStatus();

  if (status === "connected") return null; // hide when all good

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-[11px] font-bold border backdrop-blur-sm transition-all animate-in slide-in-from-bottom-2 duration-300 ${
        status === "reconnecting"
          ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-rose-50 border-rose-200 text-rose-700"
      }`}
    >
      {status === "reconnecting" ? (
        <>
          <Loader2 size={13} className="animate-spin" />
          Server se reconnect ho raha hai…
        </>
      ) : (
        <>
          <WifiOff size={13} />
          Server connection lost — retrying…
        </>
      )}
    </div>
  );
};

export default SocketStatusBadge;
