"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LIFE_STAGES, MAX_GALLERY_IMAGES, MAX_IMAGE_BYTES } from "@/types/inspirations";
import type { Inspiration } from "@/types/inspirations";

function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setUrl(String(reader.result));
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  return url ? <Image unoptimized src={url} alt={file.name} width={96} height={96} className="h-20 w-20 rounded-md object-cover" /> : null;
}

export function InspirationForm({ person, onClose, onSaved }: {
  person?: Inspiration;
  onClose: () => void;
  onSaved: (person: Inspiration) => void;
}) {
  const [selectedStages, setSelectedStages] = useState(person?.stage ?? ["School"]);
  const [gallery, setGallery] = useState(person?.gallery ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [profile, setProfile] = useState<File | null>(null);
  const [removeProfile, setRemoveProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const textareaClass = "min-h-24 w-full rounded-md border border-line-2 bg-base p-3 text-base text-ink focus:border-amber focus:outline-none";

  function validateFiles(images: File[]) {
    if (images.some((file) => file.size > MAX_IMAGE_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Choose JPEG, PNG, or WebP images up to 1 MB each.");
      return false;
    }
    setError("");
    return true;
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.delete("gallery");
    form.delete("profilePicture");
    for (const url of gallery) form.append("retainedGallery", url.split("/").pop()!);
    for (const file of files) form.append("gallery", file);
    if (profile) form.set("profilePicture", profile);
    form.set("removeProfile", String(removeProfile));
    setSaving(true);
    setError("");
    try {
      const response = await fetch(person ? `/api/inspirations/${person.id}` : "/api/inspirations", {
        method: person ? "PUT" : "POST", body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save this person.");
      onSaved(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{person ? "Edit inspiration" : "Add an inspiration"}</DialogTitle>
          <DialogDescription>Remember their progress and what it inspires you to work toward.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <fieldset disabled={saving} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="inspiration-name">Name</Label>
              <Input id="inspiration-name" name="name" defaultValue={person?.name} maxLength={100} required />
            </div>
            <fieldset className="space-y-2" aria-describedby="inspiration-stage-hint">
              <legend className="text-sm font-medium text-ink">Where we met</legend>
              <p id="inspiration-stage-hint" className="text-xs text-ink-3">Choose one or more life stages.</p>
              <div className="flex flex-wrap gap-3">
                {LIFE_STAGES.map((stage) => (
                  <label key={stage} className="flex cursor-pointer items-center gap-2 rounded-md border border-line-2 px-3 py-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      name="stage"
                      value={stage}
                      checked={selectedStages.includes(stage)}
                      onChange={(event) => setSelectedStages((current) =>
                        event.target.checked ? [...current, stage] : current.filter((item) => item !== stage)
                      )}
                      className="h-4 w-4 accent-amber"
                    />
                    {stage}
                  </label>
                ))}
              </div>
              {!selectedStages.length && <p role="alert" className="text-sm text-red-500">Choose at least one life stage.</p>}
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="inspiration-description">Description</Label>
              <textarea id="inspiration-description" name="description" defaultValue={person?.description} placeholder="How do you know them? What are they achieving now?" maxLength={1000} required className={textareaClass} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspiration-text">My motivation</Label>
              <textarea id="inspiration-text" name="text" defaultValue={person?.text} placeholder="Their progress reminds me I can go further. Here is what I will work toward…" maxLength={2000} required className={textareaClass} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspiration-profile">Profile picture</Label>
              <Input id="inspiration-profile" type="file" name="profilePicture" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && validateFiles([file])) { setProfile(file); setRemoveProfile(false); }
                event.target.value = "";
              }} />
              {profile ? <FilePreview file={profile} /> : person?.profilePicture && !removeProfile ? (
                <Image unoptimized src={person.profilePicture} alt={person.name} width={80} height={80} className="h-20 w-20 rounded-md object-cover" />
              ) : null}
              {(profile || (person?.profilePicture && !removeProfile)) && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setProfile(null); setRemoveProfile(true); }}>Remove picture</Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspiration-gallery">Image gallery</Label>
              <p id="inspiration-image-hint" className="text-xs text-ink-3">Up to {MAX_GALLERY_IMAGES} gallery images. JPEG, PNG, or WebP, up to 1 MB each.</p>
              <Input id="inspiration-gallery" type="file" name="gallery" multiple accept="image/jpeg,image/png,image/webp" aria-describedby="inspiration-image-hint" onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                if (gallery.length + files.length + selected.length > MAX_GALLERY_IMAGES) {
                  setError(`Choose up to ${MAX_GALLERY_IMAGES} gallery images.`);
                } else if (validateFiles(selected)) setFiles((current) => [...current, ...selected]);
                event.target.value = "";
              }} />
              <div className="flex flex-wrap gap-3">
                {gallery.map((url, index) => (
                  <div key={url}>
                    <Image unoptimized src={url} alt={`Gallery image ${index + 1}`} width={80} height={80} className="h-20 w-20 rounded-md object-cover" />
                    <Button type="button" size="sm" variant="ghost" aria-label={`Remove gallery image ${index + 1}`} onClick={() => setGallery(gallery.filter((image) => image !== url))}>Remove</Button>
                  </div>
                ))}
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`}>
                    <FilePreview file={file} />
                    <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((_, fileIndex) => fileIndex !== index))}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !selectedStages.length}>{saving ? "Saving…" : "Save inspiration"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
