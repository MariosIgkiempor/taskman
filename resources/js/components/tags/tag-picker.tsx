import { Check, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tagColorKeys, tagColors } from "@/lib/tag-colors";
import type { Tag } from "@/types";

interface TagPickerProps {
  tags: Tag[];
  selectedTagIds: number[];
  onToggle: (tagId: number) => void;
  onCreate: (name: string, color: string) => void;
  onClose: () => void;
  searchQuery: string;
  inline?: boolean;
}

export function TagPicker({
  tags,
  selectedTagIds,
  onToggle,
  onCreate,
  onClose,
  searchQuery,
  inline = false,
}: TagPickerProps) {
  const [newTagColorIndex, setNewTagColorIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredTags = useMemo(() => {
    if (!searchQuery) {
      return tags;
    }
    const lower = searchQuery.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(lower));
  }, [tags, searchQuery]);

  const exactMatch = useMemo(() => {
    return tags.some((tag) => tag.name.toLowerCase() === searchQuery.toLowerCase());
  }, [tags, searchQuery]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        if (index < filteredTags.length) {
          onToggle(filteredTags[index].id);
        }
      }
    },
    [filteredTags, onToggle, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleCreate = () => {
    if (searchQuery.trim()) {
      onCreate(searchQuery.trim(), tagColorKeys[newTagColorIndex]);
    }
  };

  const cycleColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewTagColorIndex((i) => (i + 1) % tagColorKeys.length);
  };

  const currentNewColor = tagColorKeys[newTagColorIndex];

  return (
    <div
      ref={containerRef}
      className={inline ? "p-1" : "w-56 rounded-lg border border-border bg-popover p-1 shadow-md"}
    >
      {filteredTags.length === 0 && !searchQuery && (
        <div className="px-2 py-3 text-center text-muted-foreground text-xs">
          No tags yet. Type # to create one.
        </div>
      )}

      {filteredTags.map((tag, index) => {
        const isSelected = selectedTagIds.includes(tag.id);
        const colors = tagColors[tag.color] ?? tagColors.gray;

        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
          >
            <span className={`${colors.dot} size-2 shrink-0 rounded-full`} />
            <span className="flex-1 truncate">{tag.name}</span>
            {index < 9 && (
              <kbd className="ml-auto text-[0.6rem] text-muted-foreground/50">
                {"\u2318"}
                {index + 1}
              </kbd>
            )}
            {isSelected && <Check className="size-3.5 shrink-0 text-primary" />}
          </button>
        );
      })}

      {searchQuery && !exactMatch && (
        <button
          type="button"
          tabIndex={0}
          onClick={handleCreate}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          className="flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
        >
          <button
            type="button"
            onClick={cycleColor}
            className={`${tagColors[currentNewColor].dot} size-2 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-popover ${tagColors[currentNewColor].ring}`}
          />
          <Plus className="size-3 text-muted-foreground" />
          <span className="truncate">
            Create <span className="font-medium">&ldquo;{searchQuery}&rdquo;</span>
          </span>
        </button>
      )}
    </div>
  );
}
