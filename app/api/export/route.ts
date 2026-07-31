import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HabitModel from "@/models/Habit";
import TimeLogModel from "@/models/TimeLog";

/** RFC 4180: wrap in quotes and double any internal quote. */
function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

const COLUMNS = [
  "date",
  "habit",
  "hours",
  "minutes",
  "source",
  "focus_rating",
  "note",
  "started_at",
  "ended_at",
  "log_id",
  "habit_id",
];

/**
 * Sessions joined to their habit's title, newest first. Logs whose habit was
 * deleted still export — the hours happened — labelled by whatever title the
 * habit had, or "(deleted habit)" if the record is gone entirely.
 */
export async function GET(request: Request) {
  await dbConnect();

  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "csv";
  const [habits, logs] = await Promise.all([
    HabitModel.find({}).lean(),
    TimeLogModel.find({}).sort({ date: -1 }).lean(),
  ]);

  const titleById = new Map(habits.map((h) => [h.id, h.title]));
  const stamp = new Date().toISOString().slice(0, 10);

  const rows = logs.map((log) => ({
    date: log.date,
    habit: titleById.get(log.habitId) ?? "(deleted habit)",
    hours: Number((log.durationSeconds / 3600).toFixed(3)),
    minutes: Math.round(log.durationSeconds / 60),
    source: log.endTime ? "timer" : "manual",
    focus_rating: log.focusRating ?? "",
    note: log.note ?? "",
    started_at: log.startTime,
    ended_at: log.endTime ?? "",
    log_id: log.id,
    habit_id: log.habitId,
  }));

  if (format === "json") {
    return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), sessions: rows }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="practice-log-${stamp}.json"`,
      },
    });
  }

  const csv = [
    COLUMNS.join(","),
    ...rows.map((row) =>
      COLUMNS.map((column) => csvCell(row[column as keyof typeof row])).join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="practice-log-${stamp}.csv"`,
    },
  });
}
