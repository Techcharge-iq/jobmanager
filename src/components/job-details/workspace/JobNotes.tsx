import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { createJobComment, listJobComments } from "@/data/jobChat";

/** Inline notes: same data calls as the chat dialog (job comments). */
export function JobNotes({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const { data: notes = [], isLoading, isError } = useQuery({ queryKey: ["job-notes", jobId], queryFn: () => listJobComments(jobId), staleTime: 30_000 });

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    try {
      await createJobComment(jobId, user.id, text.trim());
      setText("");
      await queryClient.invalidateQueries({ queryKey: ["job-notes", jobId] });
    } catch (error) {
      console.error("Error sending note:", error);
      toast({ title: "Error", description: "Failed to add the note", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Loading notes…</p> : isError ? <p role="alert" className="text-sm text-destructive">Couldn’t load notes. Check your connection and try again.</p> : notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet. Add the first one below.</p> : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-xs"><span className="font-medium">{n.user_profile.full_name}</span><time dateTime={n.created_at} className="text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</time></div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{n.comment}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Write a note. Enter to send, Shift+Enter for a new line." aria-label="New note" className="min-h-[72px] resize-none" disabled={sending} />
        <div className="flex justify-end"><Button type="button" size="sm" onClick={() => void send()} disabled={!text.trim() || sending}><Send className="h-4 w-4 rtl:-scale-x-100" />{sending ? "Sending…" : "Add note"}</Button></div>
      </div>
    </div>
  );
}
