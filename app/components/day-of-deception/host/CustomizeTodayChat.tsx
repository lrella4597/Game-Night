"use client";

import { useState, useRef, useEffect } from "react";
import type {
  ChatMessage,
  MissionPackItem,
  EventPackItem,
  ContextSummary,
  CustomizeTodayResponse,
} from "@/lib/chat/types";
import { apiFetch } from "@/lib/utils/apiErrorHandler";

interface CustomizeTodayChatProps {
  sessionId: string;
  onPackGenerated: (
    missionPack: MissionPackItem[],
    eventPack: EventPackItem[],
    contextSummary: ContextSummary
  ) => void;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  "We're at a backyard BBQ with 12 friends",
  "Office holiday party, 20 people, keep it PG",
  "Beach day with 8 close friends, chaotic energy",
  "Team building retreat, 15 coworkers",
];

export default function CustomizeTodayChat({
  sessionId,
  onPackGenerated,
  onClose,
}: CustomizeTodayChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [latestPack, setLatestPack] = useState<CustomizeTodayResponse | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setInput((prev) => prev + finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== "network" && event.error !== "aborted") {
            console.warn("Speech recognition error:", event.error);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSend = async (overrideMessage?: string) => {
    const messageText = overrideMessage || input.trim();
    if (!messageText || loading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Get conversation history
      const conversationHistory = messages
        .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n");

      const res = await apiFetch("/api/chat/customize-today", {
        method: "POST",
        body: JSON.stringify({
          message: messageText,
          conversationHistory,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.response) {
        throw new Error(data.error || "Failed to get response");
      }

      const chatResponse: CustomizeTodayResponse = data.response;

      // Check if the response contains packs
      if (
        chatResponse.mission_pack &&
        chatResponse.mission_pack.length > 0 &&
        chatResponse.event_pack &&
        chatResponse.event_pack.length > 0
      ) {
        setLatestPack(chatResponse);
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: chatResponse.assistant_message,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error in chat:", error);

      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `Error: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUsePack = () => {
    if (!latestPack) return;
    onPackGenerated(
      latestPack.mission_pack,
      latestPack.event_pack,
      latestPack.context_summary
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-green-400">
            Customize Today
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Describe your event and I'll create a custom mission and event pack!
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
          title="Close chat"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[#141a0f] rounded-xl border border-green-900/30 p-4 mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4 opacity-60">
              <svg
                className="w-16 h-16 text-green-500/40 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-green-400">
              Tell me about your event
            </p>
            <p className="text-sm mt-2 max-w-md text-white/40">
              Describe the setting, vibe, and number of players. I'll design
              custom missions and events to match!
            </p>

            {/* Suggested prompt chips */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="px-3 py-2 text-xs rounded-lg border border-green-700/40 bg-green-900/20 text-green-300 hover:bg-green-800/30 hover:border-green-600/50 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-green-600 text-white"
                  : "bg-white/5 text-white border border-green-900/30"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* Use This Pack button after assistant response with packs */}
        {latestPack && !loading && messages.length > 0 && (
          <div className="flex justify-center pt-2">
            <button
              onClick={handleUsePack}
              className="px-6 py-3 rounded-xl font-semibold bg-green-600 hover:bg-green-500 text-white transition-all shadow-lg shadow-green-900/30 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Use This Pack ({latestPack.mission_pack.length} missions,{" "}
              {latestPack.event_pack.length} events)
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl px-4 py-3 bg-white/5 border border-green-900/30">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                <span className="text-sm text-green-300/70">
                  Designing your pack...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Describe your event, setting, and vibe..."
            className="w-full px-4 py-3 pr-12 rounded-xl border border-green-900/30 bg-[#141a0f] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
            rows={2}
            disabled={loading}
          />

          {/* Mic button */}
          {recognitionRef.current && (
            <button
              onClick={toggleListening}
              className={`absolute right-3 top-3 p-2 rounded-lg transition-all ${
                isListening
                  ? "bg-red-500/20 text-red-400 animate-pulse"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
              }`}
              title={isListening ? "Stop recording" : "Start voice input"}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </button>
          )}
        </div>

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="px-6 py-3 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Send
        </button>
      </div>
    </div>
  );
}
