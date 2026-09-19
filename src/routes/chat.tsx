import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCheck, MoreHorizontal, Paperclip, Phone, Search, Send, Smile, Video } from "lucide-react";
import { AppShell } from "@/components/crm/AppShell";

type Message = { from: "customer" | "rep"; text: string; time: string };
type Conversation = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  stage: string;
  accent: string;
  lastMessage: string;
  lastSeen: string;
  unread?: number;
  messages: Message[];
};

const conversationsSeed: Conversation[] = [
  {
    id: "priya",
    name: "Priya Mehta",
    initials: "PM",
    phone: "+91 98450 22110",
    stage: "Interested",
    accent: "bg-amber-100 text-amber-700",
    lastMessage: "Could we schedule a site visit this Saturday?",
    lastSeen: "10:42 AM",
    unread: 2,
    messages: [
      { from: "customer", text: "Hi, I wanted to understand the pricing for the 2BHK units.", time: "10:28 AM" },
      { from: "rep", text: "Hi Priya, I can share the latest availability and payment plans.", time: "10:31 AM" },
      { from: "customer", text: "Could we schedule a site visit this Saturday?", time: "10:42 AM" },
    ],
  },
  {
    id: "rohit",
    name: "Rohit Sharma",
    initials: "RS",
    phone: "+91 98200 41233",
    stage: "Negotiation",
    accent: "bg-sky-100 text-sky-700",
    lastMessage: "I will review the revised offer tonight.",
    lastSeen: "Yesterday",
    messages: [
      { from: "customer", text: "Can you send the revised offer for Tower A?", time: "Yesterday" },
      { from: "rep", text: "Of course. I have included the updated payment schedule as well.", time: "Yesterday" },
      { from: "customer", text: "I will review the revised offer tonight.", time: "Yesterday" },
    ],
  },
  {
    id: "sana",
    name: "Sana Qureshi",
    initials: "SQ",
    phone: "+91 98111 60422",
    stage: "Contacted",
    accent: "bg-rose-100 text-rose-700",
    lastMessage: "Thanks, I have received the brochure.",
    lastSeen: "Mon",
    messages: [
      { from: "rep", text: "Sharing the Greenwood Heights brochure for your review.", time: "Mon" },
      { from: "customer", text: "Thanks, I have received the brochure.", time: "Mon" },
    ],
  },
  {
    id: "ananya",
    name: "Ananya Iyer",
    initials: "AI",
    phone: "+91 90040 78812",
    stage: "New lead",
    accent: "bg-violet-100 text-violet-700",
    lastMessage: "Looking for a home near Andheri.",
    lastSeen: "Sun",
    messages: [
      { from: "customer", text: "Looking for a home near Andheri.", time: "Sun" },
      { from: "rep", text: "I can help with a few options that match your preference.", time: "Sun" },
    ],
  },
];

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Customer Chat — Manju Groups" },
      { name: "description", content: "Respond to customer conversations and keep the sales pipeline moving." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const [conversations, setConversations] = useState(conversationsSeed);
  const [selectedId, setSelectedId] = useState(conversationsSeed[0].id);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const filteredConversations = useMemo(
    () => conversations.filter((conversation) => conversation.name.toLowerCase().includes(search.toLowerCase())),
    [conversations, search],
  );
  const activeConversation = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];

  function send() {
    if (!draft.trim()) return;
    const message: Message = { from: "rep", text: draft.trim(), time: "Now" };
    setConversations((current) => current.map((conversation) => conversation.id === activeConversation.id
      ? { ...conversation, messages: [...conversation.messages, message], lastMessage: message.text, lastSeen: "Now", unread: undefined }
      : conversation));
    setDraft("");
  }

  return (
    <AppShell eyebrow="Customer chat" title="Inbox & conversations">
      <section className="grid min-h-[calc(100vh-12rem)] gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="glass animate-rise flex min-h-[620px] flex-col overflow-hidden rounded-2xl">
          <div className="border-b border-border px-4 pb-4 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div><div className="text-[15px] font-semibold tracking-tight">Messages</div><div className="mt-0.5 text-[12px] text-muted">4 active conversations</div></div>
              <div className="rounded-full bg-success/10 px-2.5 py-1 font-mono text-[10px] text-success">Live</div>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input className="field h-10 pl-9 text-[12px]" placeholder="Search conversations" aria-label="Search conversations" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {filteredConversations.map((conversation) => (
              <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={selectedId === conversation.id ? "flex w-full items-start gap-3 rounded-xl bg-primary/[0.08] p-3 text-left ring-1 ring-primary/15" : "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-foreground/[0.04]"}>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${conversation.accent}`}>{conversation.initials}</span>
                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-semibold">{conversation.name}</span><span className="shrink-0 font-mono text-[10px] text-faint">{conversation.lastSeen}</span></span><span className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-[11px] text-muted">{conversation.lastMessage}</span>{conversation.unread && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{conversation.unread}</span>}</span></span>
              </button>
            ))}
          </div>
        </aside>

        <section className="glass animate-rise flex min-h-[620px] flex-col overflow-hidden rounded-2xl [animation-delay:60ms]">
          <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-3"><span className={`flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${activeConversation.accent}`}>{activeConversation.initials}</span><div className="min-w-0"><div className="truncate text-[14px] font-semibold">{activeConversation.name}</div><div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted"><span>{activeConversation.phone}</span><span className="size-1 rounded-full bg-success" /><span className="text-success">Online</span></div></div></div>
            <div className="flex items-center gap-1"><button type="button" aria-label="Start phone call" className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"><Phone className="size-4" /></button><button type="button" aria-label="Start video call" className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"><Video className="size-4" /></button><button type="button" aria-label="More conversation actions" className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"><MoreHorizontal className="size-4" /></button></div>
          </header>
          <div className="flex flex-1 flex-col bg-foreground/[0.015]">
            <div className="flex-1 space-y-5 overflow-y-auto p-5"><div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-faint"><span className="h-px flex-1 bg-border" />Today<span className="h-px flex-1 bg-border" /></div>{activeConversation.messages.map((message, index) => <div key={`${message.from}-${index}`} className={message.from === "rep" ? "flex justify-end" : "flex justify-start"}><div className="max-w-[78%]"><div className={message.from === "rep" ? "rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[13px] leading-5 text-primary-foreground shadow-sm" : "rounded-2xl rounded-bl-md bg-surface px-4 py-3 text-[13px] leading-5 text-foreground shadow-sm ring-1 ring-border"}>{message.text}</div><div className={message.from === "rep" ? "mt-1 flex items-center justify-end gap-1 text-[10px] text-muted" : "mt-1 text-[10px] text-faint"}>{message.time}{message.from === "rep" && <CheckCheck className="size-3 text-primary" />}</div></div></div>)}</div>
            <div className="border-t border-border bg-surface/70 p-3"><div className="flex items-center gap-2 rounded-xl border border-border-strong bg-background/70 p-1.5"><button type="button" aria-label="Attach a file" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"><Paperclip className="size-4" /></button><input className="min-w-0 flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-faint" placeholder="Write a message..." aria-label="Write a message" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} /><button type="button" aria-label="Add emoji" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"><Smile className="size-4" /></button><button type="button" aria-label="Send message" onClick={send} disabled={!draft.trim()} className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"><Send className="size-4" /></button></div></div>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
