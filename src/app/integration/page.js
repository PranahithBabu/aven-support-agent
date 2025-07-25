"use client";
import React, { useEffect, useRef, useState } from "react";

export default function VapiPage() {
  const [logs, setLogs] = useState([]);
  const vapiRef = useRef(null);
  const [callActive, setCallActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper to add logs
  const addLog = (msg) => setLogs((prev) => [...prev, msg]);

  // Start Vapi and set up event listeners
  useEffect(() => {
    if (typeof window === "undefined") return;
    let Vapi;
    let vapi;
    let cleanup = () => {};
    import("@vapi-ai/web").then((mod) => {
      Vapi = mod.default;
      vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
      vapiRef.current = vapi;
      // Listen for events
      vapi.on("call-start", () => {
        addLog("Call started");
        setCallActive(true);
      });
      vapi.on("call-end", () => {
        addLog("Call ended");
        setCallActive(false);
      });
      vapi.on("message", async (message) => {
        if (message.type === "transcript" && message.role === "user") {
          addLog(`User: ${message.transcript}`);
          setIsProcessing(true);
          // Detect callback intent
          if (/callback|call back|schedule.*call|phone call|call me/i.test(message.transcript)) {
            const confirmMsg = "Callback scheduled! Our team will contact you soon.";
            addLog(`Aven: ${confirmMsg}`);
            vapi.speak(confirmMsg);
            setIsProcessing(false);
            return; // Do not send to RAG API
          }
          // Send transcript to backend API
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/query`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question: message.transcript }),
            });
            const data = await res.json();
            const answer = data.answer || "Sorry, I couldn't find an answer to your question.";
            addLog(`Aven: ${answer}`);
            // Speak the answer using Vapi
            vapi.speak(answer);
          } catch (err) {
            addLog("Aven: Sorry, something went wrong.");
          } finally {
            setIsProcessing(false);
          }
        }
      });
      cleanup = () => {
        vapi.off("call-start");
        vapi.off("call-end");
        vapi.off("message");
      };
    });
    return cleanup;
  }, []);

  const handleStart = () => {
    if (vapiRef.current) {
      vapiRef.current.start("cb036b7f-e4ae-4bc8-a016-1c670193526b");
    }
  };
  const handleStop = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Vapi Voice Demo (Aven Support)</h1>
      <button onClick={handleStart} disabled={callActive || isProcessing} style={{ marginRight: 8 }}>
        Start Voice Call
      </button>
      <button onClick={handleStop} disabled={!callActive}>
        Stop Call
      </button>
      {isProcessing && <div style={{ marginTop: 8, color: "#0070f3" }}>Aven is thinking...</div>}
      <div style={{ marginTop: 24 }}>
        <h2>Logs</h2>
        <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, minHeight: 100 }}>
          {logs.length === 0 ? <div>No logs yet.</div> : logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      </div>
    </div>
  );
}