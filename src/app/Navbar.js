"use client";
import { Volume2, VolumeX } from "lucide-react";

export default function Navbar({ isMuted, setIsMuted }) {
  return (
    <header className="flex items-center gap-3 px-8 py-4 border-b bg-white fixed top-0 left-0 w-full z-10 shadow-sm">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">A</div>
      <div>
        <div className="font-semibold text-lg text-gray-900">Aven Support</div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
          AI Assistant • Online
        </div>
      </div>
      <div className="ml-auto">
        <button
          className={`p-2 rounded-xl shadow transition-colors cursor-pointer ${isMuted ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}
          title={isMuted ? 'Unmute voice output' : 'Mute voice output'}
          onClick={() => setIsMuted((m) => !m)}
          aria-pressed={isMuted}
        >
          {isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
        </button>
      </div>
    </header>
  );
} 