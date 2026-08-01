import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CategoryModel from "@/models/Category";
import NoteModel from "@/models/Note";
import { Category, CategoryPatch } from "@/types";
import { wouldCycle } from "@/lib/tree";

/** `id` and `createdAt` are identity; only these two may change. */
const EDITABLE: (keyof CategoryPatch)[] = ["name", "parentId"];

function pickEditable(body: Record<string, unknown>): CategoryPatch {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch as CategoryPatch;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const patch = pickEditable(await request.json());

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No editable fields provided" },
      { status: 400 }
    );
  }

  if (typeof patch.name === "string") {
    patch.name = patch.name.trim();
    if (!patch.name) {
      return NextResponse.json({ error: "A folder needs a name" }, { status: 400 });
    }
  }

  if (patch.parentId !== undefined) {
    const categories = (await CategoryModel.find().lean()) as unknown as Category[];

    if (patch.parentId && !categories.some((c) => c.id === patch.parentId)) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 400 });
    }

    // Moving a folder into its own descendant detaches the whole branch from
    // the root — it would simply vanish from the tree.
    if (wouldCycle(categories, id, patch.parentId)) {
      return NextResponse.json(
        { error: "A folder can't be moved inside itself" },
        { status: 400 }
      );
    }
  }

  try {
    const category = await CategoryModel.findOneAndUpdate(
      { id },
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!category) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

/**
 * Deleting a folder never deletes what's in it. Child folders and notes are
 * lifted one level to the deleted folder's own parent, so the worst case is
 * things moving up a level — not a note disappearing with the folder.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;

  const category = await CategoryModel.findOne({ id });
  if (!category) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const parentId = category.parentId ?? null;

  await Promise.all([
    CategoryModel.updateMany({ parentId: id }, { $set: { parentId } }),
    NoteModel.updateMany({ categoryId: id }, { $set: { categoryId: parentId } }),
  ]);

  await CategoryModel.deleteOne({ id });

  // The client needs `movedTo` to re-home the rows it already holds.
  return NextResponse.json({ message: "Deleted", id, movedTo: parentId });
}
