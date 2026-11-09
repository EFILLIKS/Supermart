import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Bot, ListPlus, ShoppingBasket } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductImage, SimulatedAiBadge } from "@/components/shared";
import { assistant, type AssistantReply } from "@/lib/ai";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

interface Message {
  id: number;
  from: "you" | "bot";
  text: string;
  reply?: AssistantReply;
}

const STARTERS = ["Vegan breakfast under ₹200", "What do I need for dal tadka?", "Party snacks for friends", "Healthy food for kids", "Plan my weekly family shop"];

export function AssistantChat({ compact = false, starters = STARTERS }: { compact?: boolean; starters?: string[] }) {
  const products = useStore((s) => s.products);
  const orders = useStore((s) => s.orders);
  const add = useStore((s) => s.addToCart);
  const smartList = useStore((s) => s.smartList);
  const setSmartList = useStore((s) => s.setSmartList);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: "bot", text: "Hello! Tell me what you are cooking, your budget, or your diet, and I will search the store for you." }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || thinking) return;
    setInput("");
    setMessages((m) => [...m, { id: Date.now(), from: "you", text: clean }]);
    setThinking(true);
    try {
      const reply = await assistant.reply(clean, { products, orders });
      setMessages((m) => [...m, { id: Date.now() + 1, from: "bot", text: reply.text, reply }]);
    } catch {
      setMessages((m) => [...m, { id: Date.now() + 1, from: "bot", text: "Sorry, I could not answer that. Please try again." }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-3xl border bg-card", compact ? "h-full rounded-none border-0" : "h-[72vh]")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <span className="flex items-center gap-2 font-semibold"><span className="grid size-8 place-items-center rounded-full bg-emerald-700 text-white"><Bot className="size-4" aria-hidden /></span>Shopping assistant</span>
        <SimulatedAiBadge />
      </div>
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div key={m.id} layout initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 340, damping: 26 }} className={cn("flex", m.from === "you" && "justify-end")}>
              <div className={cn("max-w-[92%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line", m.from === "you" ? "rounded-br-md bg-emerald-700 text-white" : "rounded-bl-md bg-muted")}>
                {m.text}
                {m.reply && m.reply.products.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.reply.products.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }} className="flex items-center gap-2 rounded-xl bg-card p-2 text-foreground">
                        <ProductImage src={p.image} alt="" className="size-11 shrink-0" />
                        <Link to={`/shop/products/${p.slug}`} className="min-w-0 flex-1 hover:text-primary"><p className="truncate text-xs font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{formatMoney(p.price)} · {p.unit}</p></Link>
                        <Button size="sm" variant="secondary" className="rounded-full" onClick={() => { add(p.id); toast.success(`${p.name} added`); }} aria-label={`Add ${p.name} to basket`}>Add</Button>
                      </motion.div>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" className="rounded-full" onClick={() => { m.reply!.products.forEach((p) => add(p.id)); toast.success(`${m.reply!.products.length} items added to your basket`); }}><ShoppingBasket className="size-4" />Add all</Button>
                      {m.reply.listItems && (
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => {
                          setSmartList([...smartList, ...m.reply!.products.filter((p) => !smartList.some((x) => x.productId === p.id)).map((p, i) => ({ id: `li-${Date.now()}-${i}`, text: p.name, quantity: 1, done: false, productId: p.id }))]);
                          toast.success("Saved to your smart list");
                        }}><ListPlus className="size-4" />Save to list</Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {thinking && (
            <motion.div key="thinking" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex" role="status" aria-label="Assistant is working">
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3.5">
                {[0, 1, 2].map((i) => <motion.span key={i} className="size-2 rounded-full bg-emerald-600" animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {starters.map((s, i) => <motion.button key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} whileHover={{ y: -2 }} type="button" className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary" onClick={() => send(s)}>{s}</motion.button>)}
        </div>
      )}
      <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask for anything in the store" aria-label="Message the assistant" className="rounded-full" />
        <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={!input.trim() || thinking} aria-label="Send"><ArrowUp className="size-4" /></Button>
      </form>
    </div>
  );
}
