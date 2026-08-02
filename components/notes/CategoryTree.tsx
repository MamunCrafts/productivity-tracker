"use client";

import { useState } from "react";
import {
  ChevronRight,
  Files,
  Folder,
  FolderOpen,
  FolderPlus,
  Inbox,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createCategory,
  deleteCategoryAsync,
  updateCategoryAsync,
} from "@/store/noteSlice";
import { buildTree, countsBySubtree, type CategoryNode } from "@/lib/tree";
import { cn } from "@/lib/utils";

/** Notes in no folder. A sentinel rather than `null`, which means "all". */
export const UNFILED = "__unfiled__";

export type Selection = string | null;

/**
 * The folder rail.
 *
 * Selecting a folder shows its notes *and* its subfolders' — that's what
 * picking a folder means, and it's why the counts are subtree totals. The
 * tree is built from the flat `categories` table on every render; there are
 * never enough folders for that to matter.
 */
export function CategoryTree({
  selected,
  onSelect,
}: {
  selected: Selection;
  onSelect: (selection: Selection) => void;
}) {
  const dispatch = useAppDispatch();
  const categories = useAppSelector((state) => state.note.categories);
  const notes = useAppSelector((state) => state.note.notes);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingUnder, setAddingUnder] = useState<string | null | undefined>(
    undefined
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tree = buildTree(categories);
  const counts = countsBySubtree(categories, notes);
  const looseCount = notes.filter((n) => !n.categoryId).length;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitNew(parentId: string | null) {
    const name = draft.trim();
    if (!name) {
      setAddingUnder(undefined);
      return;
    }
    setDraft("");
    setAddingUnder(undefined);
    const created = await dispatch(createCategory({ name, parentId })).unwrap();
    // Open the parent so the new folder isn't created out of sight.
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
    onSelect(created.id);
  }

  return (
    <nav aria-label="Folders" className="text-sm">
      <ul className="space-y-0.5">
        <li>
          <RootRow
            icon={<Files className="h-3.5 w-3.5" aria-hidden />}
            label="All notes"
            count={notes.length}
            active={selected === null}
            onClick={() => onSelect(null)}
          />
        </li>

        {tree.map((node) => (
          <TreeRow
            key={node.category.id}
            node={node}
            counts={counts}
            expanded={expanded}
            selected={selected}
            onSelect={onSelect}
            onToggle={toggle}
            onAddChild={(id) => {
              setExpanded((prev) => new Set(prev).add(id));
              setDraft("");
              setAddingUnder(id);
            }}
            addingUnder={addingUnder}
            draft={draft}
            setDraft={setDraft}
            onSubmitNew={submitNew}
            onCancelNew={() => setAddingUnder(undefined)}
            onError={setError}
          />
        ))}

        {/* Only worth a row when something is actually loose — an empty
            inbox is a permanent reminder of nothing. */}
        {looseCount > 0 && (
          <li>
            <RootRow
              icon={<Inbox className="h-3.5 w-3.5" aria-hidden />}
              label="No folder"
              count={looseCount}
              active={selected === UNFILED}
              onClick={() => onSelect(UNFILED)}
            />
          </li>
        )}
      </ul>

      {addingUnder === null ? (
        <NameInput
          value={draft}
          onChange={setDraft}
          onSubmit={() => submitNew(null)}
          onCancel={() => setAddingUnder(undefined)}
          placeholder="Folder name"
          className="mt-1"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            setAddingUnder(null);
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-2"
        >
          <FolderPlus className="h-3.5 w-3.5" aria-hidden />
          New folder
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 px-2 text-xs text-danger">
          {error}
        </p>
      )}
    </nav>
  );
}

function RootRow({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface hover:text-ink"
      )}
    >
      <span className="shrink-0 text-ink-3">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 font-mono text-[11px] text-ink-3 tnum">{count}</span>
    </button>
  );
}

interface TreeRowProps {
  node: CategoryNode;
  counts: Map<string, number>;
  expanded: Set<string>;
  selected: Selection;
  onSelect: (selection: Selection) => void;
  onToggle: (id: string) => void;
  onAddChild: (id: string) => void;
  addingUnder: string | null | undefined;
  draft: string;
  setDraft: (value: string) => void;
  onSubmitNew: (parentId: string | null) => void;
  onCancelNew: () => void;
  onError: (message: string | null) => void;
}

function TreeRow(props: TreeRowProps) {
  const {
    node,
    counts,
    expanded,
    selected,
    onSelect,
    onToggle,
    onAddChild,
    addingUnder,
    draft,
    setDraft,
    onSubmitNew,
    onCancelNew,
    onError,
  } = props;

  const dispatch = useAppDispatch();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(node.category.name);
  const [confirming, setConfirming] = useState(false);

  const { category, children, depth } = node;
  const open = expanded.has(category.id);
  const active = selected === category.id;

  async function rename() {
    const next = name.trim();
    setRenaming(false);
    if (!next || next === category.name) {
      setName(category.name);
      return;
    }
    try {
      await dispatch(
        updateCategoryAsync({ id: category.id, patch: { name: next } })
      ).unwrap();
      onError(null);
    } catch (e) {
      setName(category.name);
      onError(e instanceof Error ? e.message : "Could not rename folder");
    }
  }

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 transition-colors",
          active ? "bg-surface-2" : "hover:bg-surface"
        )}
        // Indent scales with depth but stops climbing past a sane point, so a
        // deep tree doesn't squeeze its own labels out of the rail.
        style={{ paddingLeft: `${Math.min(depth, 5) * 12}px` }}
      >
        <button
          type="button"
          onClick={() => onToggle(category.id)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${category.name}` : `Expand ${category.name}`}
          className={cn(
            "shrink-0 rounded p-1 text-ink-3 transition-colors hover:text-ink",
            children.length === 0 && "pointer-events-none opacity-0"
          )}
        >
          <ChevronRight
            className={cn("h-3 w-3 transition-transform", open && "rotate-90")}
            aria-hidden
          />
        </button>

        {renaming ? (
          <NameInput
            value={name}
            onChange={setName}
            onSubmit={rename}
            onCancel={() => {
              setName(category.name);
              setRenaming(false);
            }}
            className="flex-1 py-1"
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelect(category.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left transition-colors",
                active ? "text-ink" : "text-ink-2 hover:text-ink"
              )}
            >
              {open && children.length > 0 ? (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
              ) : (
                <Folder className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate">{category.name}</span>
              <span className="shrink-0 font-mono text-[11px] text-ink-3 tnum">
                {counts.get(category.id) ?? 0}
              </span>
            </button>

            {/* Visible at low opacity rather than hidden: touch has no hover,
                so a group-hover-only control is unreachable on a phone. */}
            <div className="flex shrink-0 items-center opacity-60 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <IconButton
                title={`New folder inside ${category.name}`}
                onClick={() => onAddChild(category.id)}
              >
                <Plus className="h-3 w-3" />
              </IconButton>
              <IconButton
                title={`Rename ${category.name}`}
                onClick={() => {
                  setName(category.name);
                  setRenaming(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </IconButton>
              <IconButton
                title={
                  confirming
                    ? "Tap again — contents move up one level"
                    : `Delete ${category.name}`
                }
                className={confirming ? "text-danger" : undefined}
                onBlur={() => setConfirming(false)}
                onClick={() => {
                  // Safe by construction: deleting lifts notes and subfolders
                  // to the parent, so a mistap costs a move, not content.
                  if (!confirming) {
                    setConfirming(true);
                    return;
                  }
                  if (active) onSelect(null);
                  dispatch(deleteCategoryAsync(category.id));
                }}
              >
                <Trash2 className="h-3 w-3" />
              </IconButton>
            </div>
          </>
        )}
      </div>

      {open && (
        <ul className="space-y-0.5">
          {children.map((child) => (
            <TreeRow key={child.category.id} {...props} node={child} />
          ))}
        </ul>
      )}

      {addingUnder === category.id && (
        <div style={{ paddingLeft: `${Math.min(depth + 1, 5) * 12 + 24}px` }}>
          <NameInput
            value={draft}
            onChange={setDraft}
            onSubmit={() => onSubmitNew(category.id)}
            onCancel={onCancelNew}
            placeholder="Folder name"
            className="mt-0.5"
          />
        </div>
      )}
    </li>
  );
}

function IconButton({
  children,
  title,
  onClick,
  onBlur,
  className,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  onBlur?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onBlur={onBlur}
      className={cn(
        "rounded p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink",
        className
      )}
    >
      {children}
      <span className="sr-only">{title}</span>
    </button>
  );
}

function NameInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onCancel();
        }}
        // Blur commits rather than discards: clicking away from a name you
        // just typed should keep it, not throw it away.
        onBlur={onSubmit}
        // `text-base` on a phone so focusing it doesn't zoom iOS Safari in
        // on a rail you then have to pinch back out of.
        className="min-w-0 flex-1 rounded border border-line-2 bg-base px-2 py-1.5 text-base text-ink outline-none placeholder:text-ink-3 focus:border-amber sm:py-1 sm:text-sm"
      />
      <button
        type="button"
        // Fires before blur, so cancel actually cancels.
        onMouseDown={(e) => {
          e.preventDefault();
          onCancel();
        }}
        className="rounded p-1 text-ink-3 transition-colors hover:text-ink"
      >
        <X className="h-3 w-3" />
        <span className="sr-only">Cancel</span>
      </button>
    </div>
  );
}
