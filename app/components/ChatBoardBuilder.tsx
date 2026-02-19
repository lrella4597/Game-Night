"use client";

import { useState, useRef, useEffect } from "react";
import { useDraftCategories } from "@/lib/data/useDraftCategories";
import { useBoardTemplates } from "@/lib/data/useBoardTemplates";
import type { ChatMessage, ChatResponse } from "@/lib/chat/types";
import { apiFetch } from "@/lib/utils/apiErrorHandler";

export default function ChatBoardBuilder() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const { saveDraftCategory, draftCategories } = useDraftCategories();
  const { saveBoardTemplate, boardTemplates } = useBoardTemplates();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Get conversation history
      const conversationHistory = messages
        .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n");

      const res = await apiFetch("/api/chat/board-builder", {
        method: "POST",
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.response) {
        throw new Error(data.error || "Failed to get response");
      }

      const chatResponse: ChatResponse = data.response;

      // Execute actions
      const createdCategoryIds: string[] = [];
      const createdCategoriesData: any[] = [];

      for (const action of chatResponse.actions) {
        if (action.type === "create_draft_categories") {
          for (const cat of action.categories) {
            const categoryId = await saveDraftCategory({
              name: cat.name,
              promptTemplate: cat.promptTemplate,
              difficultyGuidance: cat.difficultyGuidance,
              answerFormatGuidance: cat.answerFormatGuidance,
              examples: cat.examples,
              origin: "chat_draft",
              tags: cat.tags,
            });

            if (categoryId) {
              createdCategoryIds.push(categoryId);
              // Store the full category data with its ID
              createdCategoriesData.push({
                categoryId,
                name: cat.name,
                promptTemplate: cat.promptTemplate,
                difficultyGuidance: cat.difficultyGuidance,
                answerFormatGuidance: cat.answerFormatGuidance,
                examples: cat.examples,
                origin: "chat_draft" as const,
              });
            }
          }
        } else if (action.type === "create_board_template") {
          // Use the categories we just created
          await saveBoardTemplate({
            name: action.boardName,
            theme: action.theme,
            difficulty_1_to_10: action.difficulty_1_to_10,
            categories: createdCategoriesData,
          });
        }
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: chatResponse.assistant_message,
        timestamp: Date.now(),
        actions: chatResponse.actions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error in chat:", error);

      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
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

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-900">Chat Board Builder</h2>
        <p className="text-sm text-slate-600 mt-1">
          Describe the board you want, and I'll create categories and prompts for you!
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-semibold">Start a Conversation</p>
            <p className="text-sm mt-2 max-w-md">
              Try: "Create a Christmas-themed board" or "Make a hard science trivia board with 6
              categories"
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-900 border border-slate-200"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

              {/* Show actions executed */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-300 space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Actions Executed:</p>
                  {msg.actions.map((action, idx) => (
                    <div key={idx} className="text-xs text-slate-600">
                      {action.type === "create_draft_categories" && (
                        <div>
                          ✅ Created {action.categories.length} draft categor
                          {action.categories.length === 1 ? "y" : "ies"}
                        </div>
                      )}
                      {action.type === "create_board_template" && (
                        <div>✅ Created board template: {action.boardName}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl px-4 py-3 bg-slate-100 border border-slate-200">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
                <span className="text-sm text-slate-600">Thinking...</span>
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
            onKeyPress={handleKeyPress}
            placeholder="Describe the board you want..."
            className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            rows={2}
            disabled={loading}
          />

          {/* Mic button */}
          {recognitionRef.current && (
            <button
              onClick={toggleListening}
              className={`absolute right-3 top-3 p-2 rounded-lg transition-all ${
                isListening
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Send
        </button>
      </div>

      {/* Quick examples */}
      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <p className="text-xs text-slate-600 w-full mb-1">Quick examples:</p>
          {[
            "Create a Christmas-themed board",
            "Make a hard science board with 6 categories",
            "Valentine's Day trivia, medium difficulty",
          ].map((example) => (
            <button
              key={example}
              onClick={() => setInput(example)}
              className="px-3 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
