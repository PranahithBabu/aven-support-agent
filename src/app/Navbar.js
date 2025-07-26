"use client";
import { Volume2, VolumeX } from "lucide-react";

export default function Navbar({ isMuted, setIsMuted }) {
  return (
    <header className="flex items-center gap-3 px-8 py-4 border-b bg-white fixed top-0 left-0 w-full z-10 shadow-sm">
      <div className="flex flex-col items-start">
        <svg data-v-e6fc4572="" width="71" height="27" viewBox="0 0 71 27" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo">
          <path d="M29.0482 16.7188L24.5517 5.10052H20.1105L26.9116 20.6214H31.336L37.8227 5.10052H33.3814L29.0482 16.7188Z" fill="black"></path>
          <path d="M63.942 4.67607C61.0924 4.67607 58.3052 5.76079 56.8432 6.61205V20.6214H60.6939V8.7862C60.6939 8.7862 61.7982 8.10472 63.6971 8.10472C66.6764 
          8.10472 67.1517 10.2364 67.1517 12.5497V20.6214H71V11.4084C71 7.72742 68.873 4.67607 63.942 4.67607Z" fill="black"></path>
          <path d="M25.3127 27H20.7586L16.255 16.4146H10.2149V12.9977H14.8026L11.3 4.76568L4.6165 20.6214H0L9.11777 0H13.4438L25.3127 27Z" fill="black"></path>
          <path d="M46.2754 4.67607C41.6109 4.67607 38.3916 8.12594 38.3916 12.7761C38.3916 17.596 41.5509 21.152 46.7292 21.152C49.3195 21.152 51.6001 20.2488
           53.2782 18.4378L50.6063 16.0538C49.7132 17.0513 48.1528 17.7469 46.6643 17.7469C44.4269 17.7469 42.2423 16.0774 42.2423 12.7761C42.2423 10.102 43.7811
            8.10472 46.2706 8.10472C48.3304 8.10472 49.7348 9.29319 49.9701 11.1537H44.9527V14.2404H53.9024C53.9024 14.2404 54.0056 13.3137 54.0056 12.6747C54.0056
             8.30987 51.3601 4.67607 46.2754 4.67607Z" fill="black"></path>
             </svg>
        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
          <span className="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
          AI Assistant
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