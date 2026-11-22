"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InspirationForm } from "@/components/inspirations/InspirationForm";
import type { Inspiration } from "@/types/inspirations";

export function InspirationSection() {
  const [people, setPeople] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<Inspiration | "new" | null>(null);
  const [viewing, setViewing] = useState<{ person: Inspiration; index: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/inspirations", { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load your inspirations.");
        setPeople(await response.json());
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [reload]);

  async function remove(person: Inspiration) {
    if (!window.confirm(`Remove ${person.name} and their images?`)) return;
    setDeleting(person.id);
    setError("");
    try {
      const response = await fetch(`/api/inspirations/${person.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to remove this person. Please try again.");
      setPeople((current) => current.filter((item) => item.id !== person.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to remove this person.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section aria-labelledby="inspiration-heading" className="mb-10 rounded-xl border border-line bg-surface/40 p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 id="inspiration-heading" className="font-display text-2xl text-ink">People who inspire me</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-3">We started in the same classrooms. Their progress reminds me of what is possible, and pushes me to aim higher and put in the work.</p>
        </div>
        <Button variant="outline" onClick={() => setEditing("new")}><Plus className="mr-2 h-4 w-4" />Add person</Button>
      </div>
      {error && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-red-500">{error}<Button size="sm" variant="ghost" onClick={() => setReload((value) => value + 1)}>Retry</Button></div>}
      {loading ? <p role="status" className="py-6 text-sm text-ink-3">Loading inspirations…</p> : !people.length ? (
        <div className="rounded-lg border border-dashed border-line-2 p-8 text-center">
          <Users className="mx-auto mb-3 h-7 w-7 text-ink-3" />
          <p className="text-sm text-ink-2">Who reminds you to aim higher?</p>
          <p className="mt-1 text-sm text-ink-3">Add someone from school, college, or university and write what their journey inspires you to achieve.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => (
            <article key={person.id} className="min-w-0 rounded-lg border border-line bg-base p-5">
              <div className="flex items-center gap-3">
                {person.profilePicture ? <Image unoptimized src={person.profilePicture} alt={person.name} width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" /> : (
                  <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xl text-ink-2">{person.name.charAt(0).toUpperCase()}</div>
                )}
                <div className="min-w-0"><h3 className="break-words font-semibold text-ink">{person.name}</h3><p className="text-xs text-ink-3">{person.stage.join(", ")}</p></div>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{person.description}</p>
              <blockquote className="mt-4 whitespace-pre-wrap break-words border-l-2 border-amber pl-3 text-sm leading-relaxed text-ink">{person.text}</blockquote>
              {person.gallery.length > 0 && (
                <div className="mt-5 grid grid-cols-4 gap-2">
                  {person.gallery.map((url, index) => (
                    <button key={url} type="button" onClick={() => setViewing({ person, index })} aria-label={`View ${person.name}'s gallery image ${index + 1}`} className="overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-amber">
                      <Image unoptimized src={url} alt={`${person.name} — gallery image ${index + 1}`} width={160} height={160} className="aspect-square w-full object-cover transition-opacity hover:opacity-80" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
                <Button size="sm" variant="ghost" disabled={deleting === person.id} onClick={() => setEditing(person)}>Edit</Button>
                <Button size="sm" variant="ghost" disabled={deleting !== null} onClick={() => void remove(person)}>{deleting === person.id ? "Removing…" : "Remove"}</Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <InspirationForm person={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSaved={(saved) => {
        setPeople((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
        setEditing(null);
      }} />}
      {viewing && (
        <Dialog open onOpenChange={(open) => { if (!open) setViewing(null); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{viewing.person.name}</DialogTitle><DialogDescription>Image {viewing.index + 1} of {viewing.person.gallery.length}</DialogDescription></DialogHeader>
            <Image unoptimized src={viewing.person.gallery[viewing.index]} alt={`${viewing.person.name} — gallery image ${viewing.index + 1}`} width={1200} height={900} className="max-h-[60vh] w-full rounded-md object-contain" />
            <div className="flex justify-between gap-3">
              <Button variant="outline" disabled={viewing.index === 0} onClick={() => setViewing({ ...viewing, index: viewing.index - 1 })}>Previous</Button>
              <Button variant="outline" disabled={viewing.index === viewing.person.gallery.length - 1} onClick={() => setViewing({ ...viewing, index: viewing.index + 1 })}>Next</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
