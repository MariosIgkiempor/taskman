import { useCallback, useEffect, useRef, useState } from "react";
import TaskReminderController from "@/actions/App/Http/Controllers/TaskReminderController";
import { requestJson } from "@/lib/request-json";

const REMINDER_OPTIONS = [
  { value: 1, label: "1 min before" },
  { value: 5, label: "5 min before" },
  { value: 15, label: "15 min before" },
  { value: 30, label: "30 min before" },
  { value: 60, label: "1 hour before" },
] as const;

interface ReminderPickerProps {
  taskId: number;
  initialReminders: number[];
}

export function ReminderPicker({ taskId, initialReminders }: ReminderPickerProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initialReminders));
  const savingRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set(initialReminders));
  }, [initialReminders]);

  const handleToggle = useCallback(
    (minutes: number) => {
      if (savingRef.current) return;

      const next = new Set(selected);
      if (next.has(minutes)) {
        next.delete(minutes);
      } else {
        next.add(minutes);
      }

      setSelected(next);
      savingRef.current = true;

      void requestJson<{ reminders: number[] }>("put", TaskReminderController.sync.url(taskId), {
        reminders: [...next],
      })
        .then((res) => {
          setSelected(new Set(res.reminders));
        })
        .catch(() => {
          setSelected(new Set(initialReminders));
        })
        .finally(() => {
          savingRef.current = false;
        });
    },
    [taskId, selected, initialReminders],
  );

  return (
    <div className="px-2 py-1.5">
      {REMINDER_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent"
        >
          <input
            type="checkbox"
            checked={selected.has(opt.value)}
            onChange={() => handleToggle(opt.value)}
            className="size-3.5 rounded border-input accent-primary"
          />
          <span className="text-foreground">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
