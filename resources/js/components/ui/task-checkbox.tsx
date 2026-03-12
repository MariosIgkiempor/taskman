import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCheckboxProps {
  checked: boolean;
  onCheckedChange: () => void;
  className?: string;
}

export function TaskCheckbox({ checked, onCheckedChange, className }: TaskCheckboxProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: Custom circular checkbox styled as button
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange();
      }}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/40 hover:border-primary/60",
        className,
      )}
    >
      {checked && <Check className="size-2.5 stroke-[3]" />}
    </button>
  );
}
