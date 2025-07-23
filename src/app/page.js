"use client";
require('dotenv').config({ path: '.env.local' });
import { useState, useRef, useEffect } from "react";
import Navbar from "./Navbar";

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      sender: "system",
      text: "Hi! I'm Aven's AI assistant. I'm here to help you with questions about our credit-building products and services. How can I assist you today?",
      time: new Date(),
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const accumulatedTranscript = useRef("");
  const [currentDate, setCurrentDate] = useState(messages[0]?.time || new Date());
  const messageRefs = useRef([]);
  const [isMuted, setIsMuted] = useState(false);
  const lastSpokenIndex = useRef(-1);
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // To track the first visible message and update the date
  useEffect(() => {
    const handleScroll = () => {
      if (!messageRefs.current.length) return;
      for (let i = 0; i < messageRefs.current.length; i++) {
        const ref = messageRefs.current[i];
        if (ref) {
          const rect = ref.getBoundingClientRect();
          if (rect.top >= 80) {
            setCurrentDate(messages[i].time);
            break;
          }
        }
      }
    };
    const main = document.getElementById('chat-main');
    if (main) {
      main.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    return () => {
      if (main) main.removeEventListener('scroll', handleScroll);
    };
  }, [messages]);

  // To make sure agent speaks current message based on mute state
  useEffect(() => {
    if (isMuted) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      return;
    }
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg.sender === "system" &&
      lastMsg.text &&
      lastSpokenIndex.current !== messages.length - 1
    ) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new window.SpeechSynthesisUtterance(lastMsg.text);
        window.speechSynthesis.speak(utter);
        lastSpokenIndex.current = messages.length - 1;
      }
    }
  }, [messages, isMuted]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setMessages((msgs) => [
      ...msgs,
      { sender: "user", text, time: new Date() },
    ]);
    setInput("");
    setIsTyping(true);
    try {
      const res = await fetch(`${process.env.BACKEND_API_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });      
      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();
      setMessages((msgs) => [
        ...msgs,
        {
          sender: "system",
          text: data.answer || "Sorry, I couldn't find an answer to your question.",
          time: new Date(),
          sources: data.sources || [],
        },
      ]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        {
          sender: "system",
          text: "Sorry, something went wrong. Please try again later.",
          time: new Date(),
          sources: [],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleMic = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    if (!listening && window.speechSynthesis) window.speechSynthesis.cancel();
    if (listening) {
      setListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }
    setListening(true);
    accumulatedTranscript.current = "";
    let recognitionInstance = new window.webkitSpeechRecognition();
    recognitionRef.current = recognitionInstance;
    recognitionInstance.lang = 'en-US';
    recognitionInstance.interimResults = false;
    recognitionInstance.maxAlternatives = 1;
    recognitionInstance.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      accumulatedTranscript.current += (accumulatedTranscript.current ? ' ' : '') + transcript;
    };
    recognitionInstance.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionInstance.onend = () => {
      setListening(false);
      if (accumulatedTranscript.current.trim()) {
        sendMessage(accumulatedTranscript.current.trim());
        accumulatedTranscript.current = "";
      }
      recognitionRef.current = null;
    };
    recognitionInstance.start();
  };

  let status = "";
  if (listening) status = "Listening... Speak now";
  else if (speaking) status = "Speaking response...";
  else if (isTyping) status = "Aven is typing...";
  else status = "Ask me anything about Aven";

  return (
    <div className="flex flex-col min-h-screen bg-[#fafbfc]">
      <Navbar isMuted={isMuted} setIsMuted={setIsMuted} />
      <div className="fixed top-[64px] left-0 w-full z-10 flex justify-center pointer-events-none mt-4">
        <span className="inline-flex px-4 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-medium shadow-sm pointer-events-none">
          {formatDate(currentDate)}
        </span>
      </div>
      <main id="chat-main" className="flex-1 flex flex-col items-center overflow-y-auto px-2 py-6" style={{ paddingTop: '112px' }}>
        <div className="w-full max-w-xl flex flex-col gap-6">
          {messages.map((msg, i) => (
            <div key={i} ref={el => messageRefs.current[i] = el} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-xl px-5 py-3 shadow-sm ${msg.sender === "user" ? "bg-blue-500 text-white" : "bg-white border text-gray-900"} max-w-[80%] relative`}>
                <div className="whitespace-pre-line text-base">{msg.text}</div>
                {msg.sender === "system" && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 text-xs text-gray-700">
                    <span className="font-medium">Sources:</span>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {msg.sources.map((src, idx) => (
                        <a key={idx} href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-blue-700 border border-gray-200 hover:underline">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M14 3h7v7m-1.5-5.5L10 14m-7 7l7-7"/></svg>
                          {src.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className={`text-xs mt-2 text-right ${msg.sender === "user" ? "text-white" : "text-gray-500"}`}>{formatTime(msg.time)}</div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-xl px-5 py-3 bg-white border max-w-[80%] text-base text-gray-700 flex items-center gap-2">
                <span className="animate-pulse">Aven is typing...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl mx-auto flex items-center gap-2 px-4 py-3 border-t bg-white"
      >
        <button
          type="button"
          onClick={handleMic}
          className={`p-2 rounded-full border cursor-pointer ${listening ? "bg-red-100 border-red-400" : "bg-gray-100 border-gray-300"} text-gray-700 hover:bg-blue-100 focus:outline-none`}
          title="Speak"
          disabled={listening}
        >
          {listening ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="red" strokeWidth="2" d="M12 15a3 3 0 003-3V7a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0m5 5v3m-4 0h8"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 15a3 3 0 003-3V7a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 01-10 0m5 5v3m-4 0h8"/></svg>
          )}
        </button>
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring"
          placeholder={listening ? "Listening... Speak now" : "Type your message..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={listening}
        />
        <button
          type="submit"
          className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 focus:outline-none disabled:bg-blue-200 disabled:text-white"
          disabled={!input.trim() || listening}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M3 20l18-8-18-8v7l15 1-15 1z"/></svg>
        </button>
      </form>
      <div className="w-full max-w-xl mx-auto px-4 pb-2 text-xs text-gray-600 text-center">
        {status}
      </div>
    </div>
  );
}
