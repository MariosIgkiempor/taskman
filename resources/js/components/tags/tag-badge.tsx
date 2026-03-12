import { X } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { tagColorKeys, tagColors } from "@/lib/tag-colors";
import type { Tag } from "@/types";

interface TagBadgeProps {
  tag: Tag;
  size?: "sm" | "default";
  onRemove?: () => void;
  onColorChange?: (color: string) => void;
}

export function TagBadge({ tag, size = "default", onRemove, onColorChange }: TagBadgeProps) {
  const colors = tagColors[tag.color] ?? tagColors.gray;
  const isSmall = size === "sm";
  const [open, setOpen] = useState(false);

  const badge = (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colors.bg} ${colors.text} ${
        isSmall ? "px-1.5 py-0 text-[0.625rem]" : "px-2 py-0.5 text-xs"
      } ${onColorChange ? "cursor-pointer" : ""}`}
    >
      <span className={`${colors.dot} size-1.5 shrink-0 rounded-full`} />
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X className="size-2.5" />
        </button>
      )}
    </span>
  );

  if (!onColorChange) {
    return badge;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span role="button" tabIndex={0} onClick={(e) => e.stopPropagation()}>
          {badge}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        side="top"
        align="start"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="grid grid-cols-5 gap-1.5">
          {tagColorKeys.map((colorKey) => {
            const c = tagColors[colorKey];
            const isActive = tag.color === colorKey;
            return (
              <button
                key={colorKey}
                type="button"
                className={`size-5 rounded-full ${c.dot} transition-transform hover:scale-125 ${
                  isActive ? "ring-2 ring-primary ring-offset-1 ring-offset-popover" : ""
                }`}
                onClick={() => {
                  if (colorKey !== tag.color) {
                    onColorChange(colorKey);
                  }
                  setOpen(false);
                }}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
