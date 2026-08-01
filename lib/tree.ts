import type { Category } from "@/types/notes";

/**
 * Category tree helpers — pure functions over the flat `Category[]`, shared
 * by the API routes and the sidebar.
 *
 * Categories are stored flat with a `parentId` and assembled into a tree on
 * read. That keeps a move to one write (change one `parentId`) instead of
 * rewriting a materialised path across every descendant, at the cost of a
 * walk that is trivial for any realistic number of folders.
 *
 * Every function here tolerates a broken table: an orphan whose parent no
 * longer exists is treated as a root, and a cycle is broken rather than
 * hung on. The UI must never be the thing that crashes on bad data.
 */

export interface CategoryNode {
  category: Category;
  children: CategoryNode[];
  depth: number;
}

export function buildTree(categories: Category[]): CategoryNode[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const childrenOf = new Map<string | null, Category[]>();

  for (const category of categories) {
    // An orphan is re-rooted rather than hidden — a folder you can't see is
    // worse than one in the wrong place.
    const parent =
      category.parentId && byId.has(category.parentId) ? category.parentId : null;
    const siblings = childrenOf.get(parent) ?? [];
    siblings.push(category);
    childrenOf.set(parent, siblings);
  }

  for (const siblings of childrenOf.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name));
  }

  const seen = new Set<string>();

  function build(parentId: string | null, depth: number): CategoryNode[] {
    return (childrenOf.get(parentId) ?? []).flatMap((category) => {
      // Cycle guard. A → B → A would otherwise recurse forever.
      if (seen.has(category.id)) return [];
      seen.add(category.id);
      return [{ category, children: build(category.id, depth + 1), depth }];
    });
  }

  return build(null, 0);
}

/**
 * A category and everything beneath it. Selecting a folder shows the notes in
 * its subfolders too — that's what picking a folder means.
 */
export function subtreeIds(categories: Category[], id: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const siblings = childrenOf.get(category.parentId) ?? [];
    siblings.push(category.id);
    childrenOf.set(category.parentId, siblings);
  }

  const ids = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const current = queue.pop()!;
    if (ids.has(current)) continue;
    ids.add(current);
    queue.push(...(childrenOf.get(current) ?? []));
  }
  return ids;
}

/** Root → leaf, for a breadcrumb. Empty if the id is unknown. */
export function pathOf(categories: Category[], id: string | null): Category[] {
  if (!id) return [];
  const byId = new Map(categories.map((c) => [c.id, c]));
  const path: Category[] = [];
  const seen = new Set<string>();

  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return path;
}

/** "Research / Papers / 2026" — the label a flat picker needs. */
export function pathLabel(categories: Category[], id: string | null): string {
  return pathOf(categories, id)
    .map((c) => c.name)
    .join(" / ");
}

/**
 * Guards the one move that would corrupt the tree: dropping a folder inside
 * itself or one of its own descendants, which detaches the whole branch.
 */
export function wouldCycle(
  categories: Category[],
  id: string,
  nextParentId: string | null
): boolean {
  if (!nextParentId) return false;
  if (nextParentId === id) return true;
  return subtreeIds(categories, id).has(nextParentId);
}

/**
 * Notes per folder, each count including its descendants — a parent showing
 * "0" while its children hold notes reads as empty when it isn't.
 */
export function countsBySubtree(
  categories: Category[],
  notes: { categoryId: string | null }[]
): Map<string, number> {
  const direct = new Map<string, number>();
  for (const note of notes) {
    if (!note.categoryId) continue;
    direct.set(note.categoryId, (direct.get(note.categoryId) ?? 0) + 1);
  }

  const counts = new Map<string, number>();
  for (const category of categories) {
    let total = 0;
    for (const id of subtreeIds(categories, category.id)) {
      total += direct.get(id) ?? 0;
    }
    counts.set(category.id, total);
  }
  return counts;
}
