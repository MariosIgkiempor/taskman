import type { Board } from '@/types';

interface BoardTabsProps {
    boards: Board[];
    selectedBoardId: number | null;
    onSelectBoard: (id: number | null) => void;
}

export function BoardTabs({
    boards,
    selectedBoardId,
    onSelectBoard,
}: BoardTabsProps) {
    if (boards.length <= 1) return null;

    return (
        <div className="flex shrink-0 gap-1 overflow-x-auto">
            <button
                type="button"
                onClick={() => onSelectBoard(null)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedBoardId === null
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                }`}
            >
                All
            </button>
            {boards.map((board) => (
                <button
                    key={board.id}
                    type="button"
                    onClick={() => onSelectBoard(board.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        selectedBoardId === board.id
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted'
                    }`}
                >
                    {board.color && (
                        <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: board.color }}
                        />
                    )}
                    {board.name}
                </button>
            ))}
        </div>
    );
}
