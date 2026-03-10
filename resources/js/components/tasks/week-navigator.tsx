import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { index as tasksIndex } from '@/routes/tasks';

interface WeekNavigatorProps {
    weekStart: string;
}

export function WeekNavigator({ weekStart }: WeekNavigatorProps) {
    const [y, m, d] = weekStart.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d);
    end.setDate(end.getDate() + 6);

    const isCurrentWeek = (() => {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        return monday.getTime() === start.getTime();
    })();

    const formatLabel = () => {
        const startMonth = start.toLocaleDateString('en-US', {
            month: 'short',
        });
        const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
        const year = end.getFullYear();

        if (startMonth === endMonth) {
            return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${year}`;
        }

        return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${year}`;
    };

    const navigate = (direction: 'prev' | 'next') => {
        const target = new Date(start);
        target.setDate(target.getDate() + (direction === 'prev' ? -7 : 7));
        const weekParam = target.toISOString().split('T')[0];
        router.get(
            tasksIndex(),
            { week: weekParam },
            { preserveState: true, preserveScroll: true },
        );
    };

    const goToToday = () => {
        router.get(
            tasksIndex(),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => navigate('prev')}
                >
                    <ChevronLeft className="size-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => navigate('next')}
                >
                    <ChevronRight className="size-4" />
                </Button>
            </div>
            <h2 className="text-sm font-semibold">{formatLabel()}</h2>
            {!isCurrentWeek && (
                <Button
                    variant="outline"
                    size="sm"
                    className="ml-1 h-7 text-xs"
                    onClick={goToToday}
                >
                    Today
                </Button>
            )}
        </div>
    );
}
