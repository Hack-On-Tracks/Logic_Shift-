'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, RefreshCw, Loader2,
  BarChart2, XCircle, Info, Sparkles, AlertTriangle, CheckCircle,
} from 'lucide-react';
import {
  chatWithAssistant, computeCriticalityScore, fetchHealth, fetchIncidents,
  ApiChatMessage, ApiCriticalityResponse, ApiIncident,
} from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: string;
  suggestedActions?: string[];
  groundedFacts?: string[];
}

// ─── Criticality Score Tool ───────────────────────────────────
function CriticalityPanel({ incidents }: { incidents: ApiIncident[] }) {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    incidents.length > 0 ? (incidents[0].incidentId || String(incidents[0].id)) : 'INC-001'
  );
  const [result, setResult] = useState<ApiCriticalityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (incidents.length > 0 && !selectedIncidentId) {
      setSelectedIncidentId(incidents[0].incidentId || String(incidents[0].id));
    }
  }, [incidents, selectedIncidentId]);

  async function handleScore() {
    if (!selectedIncidentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await computeCriticalityScore(selectedIncidentId);
      setResult(res);
    } catch {
      setError('Criticality scoring unavailable. Ensure API server is online.');
    } finally {
      setLoading(false);
    }
  }

  const fieldCls = 'w-full bg-black/40 border-2 border-black text-white text-xs font-mono px-3 py-2 focus:outline-none focus:border-[#2563EB] transition placeholder:text-slate-600';
  const labelCls = 'block text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1';

  function scoreColor(s: number) {
    if (s >= 8) return 'text-[#EF4444]';
    if (s >= 5) return 'text-[#2563EB]';
    return 'text-[#4ADE80]';
  }

  return (
    <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-5 space-y-4 font-mono">
      <div className="flex items-center gap-2 pb-2 border-b-2 border-black">
        <BarChart2 size={15} className="text-[#2563EB] stroke-[2.5]" />
        <h3 className="text-white font-black text-xs uppercase tracking-wider">INCIDENT CRITICALITY SCORER</h3>
      </div>

      <div>
        <label className={labelCls}>SELECT TARGET INCIDENT</label>
        <select
          value={selectedIncidentId}
          onChange={e => setSelectedIncidentId(e.target.value)}
          className={fieldCls}
        >
          {incidents.map(i => (
            <option key={i.id} value={i.incidentId || String(i.id)}>
              {i.incidentId || i.id} — {i.title.slice(0, 32)}
            </option>
          ))}
          {incidents.length === 0 && <option value="INC-001">INC-001 — Riverdale Flood</option>}
        </select>
      </div>

      <button
        onClick={handleScore}
        disabled={loading}
        className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-700 text-white border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 size={13} className="animate-spin" /> EVALUATING TELEMETRY...</> : <><Sparkles size={13} /> COMPUTE CRITICALITY SCORE</>}
      </button>

      {error && (
        <div className="flex items-center gap-2 bg-[#EF4444]/10 border-2 border-[#EF4444] p-3 text-[#EF4444] text-xs font-black">
          <XCircle size={13} /> {error}
        </div>
      )}

      {result && (
        <div className="border-2 border-black bg-black/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">CRITICALITY LEVEL</span>
              <span className="text-xs font-black text-white uppercase">{result.severityLevel || 'EVALUATED'}</span>
            </div>
            <span className={cn('text-3xl font-black', scoreColor(result.score))}>
              {result.score.toFixed(1)}<span className="text-sm text-slate-500">/10</span>
            </span>
          </div>

          {/* Score bar */}
          <div className="w-full h-3 bg-black border-2 border-black overflow-hidden">
            <div
              className={cn('h-full transition-all', result.score >= 8 ? 'bg-[#EF4444]' : result.score >= 5 ? 'bg-[#2563EB]' : 'bg-[#4ADE80]')}
              style={{ width: `${Math.min(100, (result.score / 10) * 100)}%` }}
            />
          </div>

          {/* Factors Breakdown */}
          {result.factors && result.factors.length > 0 && (
            <div className="space-y-1.5 border-t border-black/40 pt-2">
              <p className="text-slate-500 text-[10px] font-black uppercase">MULTI-FACTOR WEIGHT MATRIX</p>
              {result.factors.map((f, i) => (
                <div key={i} className="flex justify-between items-start text-[10px] bg-black/30 p-1.5 border border-black/50">
                  <div>
                    <span className="text-slate-300 font-bold block">{f.factor}</span>
                    <span className="text-slate-500 text-[9px]">{f.note}</span>
                  </div>
                  <span className="text-[#2563EB] font-black">{f.impact}</span>
                </div>
              ))}
            </div>
          )}

          {result.explanation && (
            <div className="border-t-2 border-black pt-2">
              <p className="text-[10px] text-slate-400 uppercase font-black mb-1">AI STRATEGIC REASONING</p>
              <p className="text-white text-xs leading-relaxed">{result.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Suggested Prompts ────────────────────────────────────────
const SUGGESTED = [
  'What are the optimal deployment protocols for flash flood zones?',
  'How should teams prioritize search and rescue vs medical evacuations?',
  'What safety hazards should responders monitor during secondary mudslides?',
  'How do I calculate field personnel needs when access routes are severed?',
];

// ─── Chat Bubble ──────────────────────────────────────────────
function Bubble({
  msg,
  onActionClick,
}: {
  msg: Message;
  onActionClick?: (action: string) => void;
}) {
  const isUser = msg.role === 'user';
  const isError = msg.role === 'error';
  return (
    <div className={cn('flex gap-3 font-mono', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-8 h-8 flex-shrink-0 flex items-center justify-center border-2 border-black font-black text-[10px]',
        isUser ? 'bg-[#2563EB] text-white' : isError ? 'bg-[#EF4444] text-white' : 'bg-white text-black'
      )}>
        {isUser ? 'YOU' : isError ? '!' : 'AI'}
      </div>
      <div className={cn(
        'max-w-[85%] border-2 border-black p-3.5 shadow-[3px_3px_0px_#000] space-y-2',
        isUser ? 'bg-[#2563EB] text-white' : isError ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#111C2E] text-white'
      )}>
        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>

        {/* Suggested Actions chips */}
        {msg.suggestedActions && msg.suggestedActions.length > 0 && (
          <div className="pt-2 border-t border-black/40 space-y-1.5">
            <span className="text-[9px] text-[#4ADE80] font-black uppercase tracking-wider block">
              RECOMMENDED ACTION DIRECTIVES:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {msg.suggestedActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => onActionClick && onActionClick(action)}
                  className="px-2 py-1 bg-black/60 hover:bg-[#2563EB] text-slate-200 hover:text-white border border-white/20 text-[9px] font-bold uppercase transition"
                >
                  ⚡ {action}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-[9px] opacity-40 uppercase">{msg.timestamp}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [geminiOk, setGeminiOk] = useState<boolean | null>(null);
  const [incidents, setIncidents] = useState<ApiIncident[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting safely on client mount
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: 'LIVE TRACK AI RESCUE ASSISTANT ONLINE.\n\nPowered by Google Gemini. I am grounded in live operational disaster telemetry and tactical rescue guidelines:\n• Emergency mission task coordination & triage\n• Real-time risk mitigation across flood, fire, and structural incidents\n• Route hazard avoidance and blockage advisory\n• Resource balancing for active rescue squads\n\nSubmit your query below or pick a suggested action.',
      timestamp: new Date().toLocaleTimeString('en-IN'),
      suggestedActions: [
        'Review flood triage guidelines',
        'Check blocked road protocols',
        'Verify resource allocation formula',
      ],
    }]);

    fetchHealth()
      .then(h => setGeminiOk(h.geminiAvailable))
      .catch(() => setGeminiOk(false));

    fetchIncidents()
      .then(setIncidents)
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;
    const userMsg: Message = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString('en-IN'),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    // Build history for backend API (role user or model)
    const history: ApiChatMessage[] = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content,
      }));

    try {
      const res = await chatWithAssistant(text.trim(), history);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString('en-IN'),
        suggestedActions: res.suggestedActions,
        groundedFacts: res.groundedFacts,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'COMMS FAILURE: Could not reach AI backend. Ensure the FastAPI server is online.',
        timestamp: new Date().toLocaleTimeString('en-IN'),
      }]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    setMessages([{
      role: 'assistant',
      content: 'SESSION RESET. Tactical dispatch assistant standing by.',
      timestamp: new Date().toLocaleTimeString('en-IN'),
    }]);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-7rem)] font-mono">
      {/* Left: Chat */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-white font-black text-lg uppercase tracking-wider">AI RESCUE ASSISTANT</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={cn(
                'w-2 h-2 border border-black',
                geminiOk === null ? 'bg-slate-500 animate-pulse' : geminiOk ? 'bg-[#4ADE80] animate-ping' : 'bg-[#EF4444]'
              )} />
              <span className={cn(
                'text-[10px] font-black uppercase tracking-wider',
                geminiOk === null ? 'text-slate-500' : geminiOk ? 'text-[#4ADE80]' : 'text-[#EF4444]'
              )}>
                {geminiOk === null ? 'CONNECTING...' : geminiOk ? 'GOOGLE GEMINI AI ACTIVE' : 'LOCAL ENGINE (SIMULATED)'}
              </span>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-[#111C2E] text-slate-300 hover:text-white hover:bg-white/10 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-[10px] font-black uppercase tracking-wider transition"
          >
            <RefreshCw size={13} /> CLEAR
          </button>
        </div>

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 bg-[#0B1220] border-2 border-black p-4 shadow-[4px_4px_0px_#000]">
          {messages.map((msg, i) => (
            <Bubble key={i} msg={msg} onActionClick={sendMessage} />
          ))}
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center border-2 border-black bg-white text-black font-black text-[10px]">AI</div>
              <div className="border-2 border-black bg-[#111C2E] p-3.5 shadow-[3px_3px_0px_#000]">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-[#2563EB] border border-black animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#2563EB] border border-black animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#2563EB] border border-black animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-slate-400 text-[10px] ml-1 font-black uppercase">REASONING DISPATCH MATRIX...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length <= 2 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTED.slice(0, 3).map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="px-2.5 py-1.5 bg-[#111C2E] border-2 border-black text-slate-300 hover:text-white hover:bg-[#2563EB] hover:border-[#2563EB] text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition text-left"
              >
                {s.slice(0, 48)}…
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="PROMPT AI DISPATCH ADVISOR... (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 bg-[#111C2E] border-2 border-black text-white text-xs font-mono px-4 py-3 focus:outline-none focus:border-[#2563EB] transition resize-none placeholder:text-slate-600"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending}
            className="px-5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-700 disabled:shadow-none text-white border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition flex items-center gap-2 text-xs font-black uppercase tracking-wider"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="stroke-[2.5]" />}
            {sending ? '' : 'DISPATCH'}
          </button>
        </div>
        <p className="text-slate-500 text-[9px] mt-1.5 uppercase tracking-wider">
          TACTICAL AI INFERENCE GROUNDED ON LIVE INCIDENT LOGS & STANDARD SEARCH/RESCUE PROTOCOLS.
        </p>
      </div>

      {/* Right: Criticality Panel */}
      <div className="lg:w-80 flex-shrink-0 overflow-y-auto">
        <CriticalityPanel incidents={incidents} />

        {/* Suggested prompts list for desktop */}
        <div className="mt-4 bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-4 space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-black">
            <Sparkles size={14} className="text-[#2563EB]" />
            <h3 className="text-white font-black text-[10px] uppercase tracking-wider">QUICK SCENARIO PROMPTS</h3>
          </div>
          {SUGGESTED.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              className="w-full text-left px-2.5 py-2 border-2 border-black bg-[#0B1220] text-slate-300 hover:text-white hover:bg-[#2563EB] hover:border-[#2563EB] text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
