import { Clock } from "lucide-react";
import { useMemo } from "react";
import { tagColors } from "@/lib/tag-colors";
import type { Task } from "@/types";

interface TagTimeBreakdownProps {
  tasks: Task[];
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

interface TagEntry {
  key: string;
  name: string;
  color: string;
  minutes: number;
}

export function TagTimeBreakdown({ tasks }: TagTimeBreakdownProps) {
  const { entries, grandTotal } = useMemo(() => {
    const map = new Map<string, TagEntry>();
    let total = 0;

    for (const task of tasks) {
      total += task.duration_minutes;

      if (task.tags.length === 0) {
        const existing = map.get("untagged");
        if (existing) {
          existing.minutes += task.duration_minutes;
        } else {
          map.set("untagged", {
            key: "untagged",
            name: "Untagged",
            color: "gray",
            minutes: task.duration_minutes,
          });
        }
      } else {
        for (const tag of task.tags) {
          const tagKey = `tag-${tag.id}`;
          const existing = map.get(tagKey);
          if (existing) {
            existing.minutes += task.duration_minutes;
          } else {
            map.set(tagKey, {
              key: tagKey,
              name: tag.name,
              color: tag.color,
              minutes: task.duration_minutes,
            });
          }
        }
      }
    }

    const sorted = Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
    return { entries: sorted, grandTotal: total };
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Clock className="size-3.5 text-primary" />
        </div>
        <h2 className="font-bold text-sm tracking-tight">Weekly Time</h2>
        <span className="ml-auto rounded-md bg-muted px-2 py-0.5 font-semibold text-muted-foreground text-xs tabular-nums">
          {formatDuration(grandTotal)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-1">
        {entries.map((entry) => (
          <div key={entry.key} className="flex items-center gap-2">
            <span
              className={`size-1.5 shrink-0 rounded-full ${tagColors[entry.color]?.dot ?? "bg-gray-500"}`}
            />
            <span className="flex-1 truncate font-medium text-xs">{entry.name}</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatDuration(entry.minutes)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
