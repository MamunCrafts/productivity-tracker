"use client";

import { useMemo } from "react";
import type { Category } from "@/types";
import { buildTree } from "@/lib/tree";
import { cn } from "@/lib/utils";

/**
 * A flat picker over a nested tree. Depth is drawn with indentation inside
 * the option label rather than `<optgroup>`, because a folder here is both a
 * group *and* a selectable destination — optgroup labels aren't selectable.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  /** Excluded along with its whole subtree — used when moving a folder. */
  excludeSubtreeOf,
  rootLabel = "No folder",
  className,
  id,
}: {
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  excludeSubtreeOf?: string;
  rootLabel?: string;
  className?: string;
  id?: string;
}) {
  const options = useMemo(() => {
    const out: { id: string; label: string }[] = [];

    function walk(nodes: ReturnType<typeof buildTree>) {
      for (const node of nodes) {
        if (node.category.id === excludeSubtreeOf) continue;
        out.push({
          id: node.category.id,
          // Figure space — a plain space collapses in an <option> on some
          // platforms, taking the hierarchy with it.
          label: `${"  ".repeat(node.depth)}${node.category.name}`,
        });
        walk(node.children);
      }
    }

    walk(buildTree(categories));
    return out;
  }, [categories, excludeSubtreeOf]);

  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        "w-full rounded-md border border-line-2 bg-base px-3 py-2 text-ink outline-none focus:border-amber",
        className
      )}
    >
      <option value="">{rootLabel}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
