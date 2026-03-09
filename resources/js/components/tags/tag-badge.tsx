import { X } from 'lucide-react';
import { tagColors } from '@/lib/tag-colors';
import type { Tag } from '@/types';

interface TagBadgeProps {
    tag: Tag;
    size?: 'sm' | 'default';
    onRemove?: () => void;
}

export function TagBadge({ tag, size = 'default', onRemove }: TagBadgeProps) {
    const colors = tagColors[tag.color] ?? tagColors.gray;
    const isSmall = size === 'sm';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full font-medium ${colors.bg} ${colors.text} ${
                isSmall ? 'px-1.5 py-0 text-[0.625rem]' : 'px-2 py-0.5 text-xs'
            }`}
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
}
