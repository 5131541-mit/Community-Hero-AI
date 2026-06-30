import { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles, User, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatSource {
  title: string;
  uri: string;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: Date;
  sources?: ChatSource[];
}

interface CivicBotProps {
  onSuggestAction?: (type: string, value?: any) => void;
}

const QUICK_SUGGESTIONS = [
  "Are there any critical issues near here?",
  "How can I earn a Green Hero badge?",
  "Explain the status of active repairs",
  "Give me tips for neighborhood water saving"
];

export default function CivicBot({ onSuggestAction }: CivicBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "Hello there! I'm CivicHero AI, your neighborhood assistant. Ask me anything about local reported issues, repair statuses, or how you can earn badges by helping out our ward!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      role: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    setError(null);

    // Prepare chat history in standard format
    const chatHistory = messages.map((m) => ({
      role: m.role,
      text: m.text
    }));

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          chatHistory: chatHistory
        })
      });

      if (!response.ok) {
        throw new Error("Failed to reach assistant server.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: data.text || "I was unable to formulate a response. Please try again.",
          timestamp: new Date(),
          sources: data.sources
        }
      ]);
    } catch (err: any) {
      console.error("Chatbot error:", err);
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Some suggestions trigger local actions, e.g., filter on map
    if (suggestion.includes("critical") && onSuggestAction) {
      onSuggestAction("filter-severity", "Critical");
    } else if (suggestion.includes("active repairs") && onSuggestAction) {
      onSuggestAction("filter-status", "In Progress");
    }
    handleSendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Bot Header */}
      <div className="bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-2 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight">CivicHero AI</span>
              <span className="bg-teal-500/10 text-teal-400 text-[9px] px-1.5 py-0.5 rounded-full font-medium border border-teal-500/20 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Ward Assistant & Real-time Info</p>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 min-h-[220px]">
        {messages.map((m, index) => (
          <div
            key={index}
            className={`flex gap-2.5 max-w-[85%] ${
              m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                m.role === "user"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-800 text-teal-400 border border-slate-700"
              }`}
            >
              {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div className="flex-1 min-w-0">
              <div
                className={`px-3 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-teal-500 text-slate-950 rounded-tr-none font-medium"
                    : "bg-slate-850 border border-slate-800 text-slate-200 rounded-tl-none"
                }`}
              >
                {m.text}

                {/* Render grounding sources if present */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] space-y-1">
                    <p className="font-semibold text-teal-400 uppercase tracking-wide text-[9px] flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Verified Web Sources:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-slate-900 hover:bg-slate-950 text-slate-300 hover:text-white px-2 py-1 rounded border border-slate-800 transition-colors flex items-center gap-1.5"
                        >
                          <span className="truncate max-w-[120px]">{src.title}</span>
                          <span className="text-[8px] text-teal-400">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-500 mt-1 block px-1">
                {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 max-w-[85%] mr-auto items-center">
            <div className="w-7 h-7 rounded-full bg-slate-800 text-teal-400 border border-slate-700 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-850 border border-slate-800 px-3.5 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
              <span className="text-xs text-slate-400">Consulting neighborhood map...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl flex items-center gap-2 text-rose-300 text-[11px]">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 py-2 bg-slate-950/20 border-t border-slate-800/50">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-500" /> Suggested Queries
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((qs, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(qs)}
                className="text-[10px] text-left bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-teal-300 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-teal-900/50 transition-all cursor-pointer"
              >
                {qs}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="p-3 bg-slate-950 border-t border-slate-800/80 flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask about neighborhood issues, status, badges..."
          className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none transition-all placeholder-slate-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className="bg-teal-500 text-slate-950 p-2 rounded-xl hover:bg-teal-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
