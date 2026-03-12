import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { RecurrenceFrequency, RecurrenceSeries } from '@/types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ORDINAL_LABELS = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

export interface RecurrenceRule {
    frequency: RecurrenceFrequency;
    interval: number;
    days_of_week: number[] | null;
    month_day: number | null;
    month_week_ordinal: number | null;
    month_week_day: number | null;
    end_date: string | null;
    end_count: number | null;
}

export interface RecurrencePickerHandle {
    isDirty: () => boolean;
    save: () => void;
}

interface RecurrencePickerProps {
    initialRule: RecurrenceSeries | null;
    scheduledDate: string;
    onSave: (rule: RecurrenceRule) => void;
    onRemove: () => void;
}

function getIsoWeekday(dateStr: string): number {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 ? 7 : day;
}

function getWeekOrdinal(dateStr: string): number {
    const d = new Date(dateStr);
    return Math.ceil(d.getDate() / 7);
}

export function recurrenceLabel(series: RecurrenceSeries): string {
    const { frequency, interval, days_of_week, month_day, month_week_ordinal, month_week_day } = series;

    if (frequency === 'daily') {
        return interval === 1 ? 'Daily' : `Every ${interval} days`;
    }

    if (frequency === 'weekly') {
        const prefix = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
        if (days_of_week && days_of_week.length > 0) {
            if (days_of_week.length === 5 && [1, 2, 3, 4, 5].every((d) => days_of_week.includes(d))) {
                return interval === 1 ? 'Every weekday' : `${prefix} on weekdays`;
            }
            const dayNames = days_of_week.map((d) => DAY_LABELS[d - 1]);
            return `${prefix} on ${dayNames.join(', ')}`;
        }
        return prefix;
    }

    if (frequency === 'monthly') {
        const prefix = interval === 1 ? 'Monthly' : `Every ${interval} months`;
        if (month_week_ordinal && month_week_day) {
            return `${prefix} on the ${ORDINAL_LABELS[month_week_ordinal - 1].toLowerCase()} ${DAY_LABELS[month_week_day - 1]}`;
        }
        if (month_day) {
            return `${prefix} on day ${month_day}`;
        }
        return prefix;
    }

    if (frequency === 'yearly') {
        return interval === 1 ? 'Yearly' : `Every ${interval} years`;
    }

    return 'Custom';
}

export const RecurrencePicker = forwardRef<RecurrencePickerHandle, RecurrencePickerProps>(
    function RecurrencePicker({ initialRule, scheduledDate, onSave, onRemove }, ref) {
    const defaultWeekday = scheduledDate ? getIsoWeekday(scheduledDate) : 1;
    const defaultOrdinal = scheduledDate ? getWeekOrdinal(scheduledDate) : 1;
    const defaultMonthDay = scheduledDate ? new Date(scheduledDate).getDate() : 1;

    const [frequency, setFrequency] = useState<RecurrenceFrequency>(
        initialRule?.frequency ?? 'weekly',
    );
    const [interval, setInterval] = useState(initialRule?.interval ?? 1);
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
        initialRule?.days_of_week ?? [defaultWeekday],
    );
    const [monthlyMode, setMonthlyMode] = useState<'day' | 'ordinal'>(
        initialRule?.month_week_ordinal ? 'ordinal' : 'day',
    );
    const [monthDay, setMonthDay] = useState(initialRule?.month_day ?? defaultMonthDay);
    const [monthWeekOrdinal, setMonthWeekOrdinal] = useState(
        initialRule?.month_week_ordinal ?? defaultOrdinal,
    );
    const [monthWeekDay, setMonthWeekDay] = useState(
        initialRule?.month_week_day ?? defaultWeekday,
    );
    const [endMode, setEndMode] = useState<'never' | 'date' | 'count'>(
        initialRule?.end_date ? 'date' : initialRule?.end_count ? 'count' : 'never',
    );
    const [endDate, setEndDate] = useState(initialRule?.end_date ?? '');
    const [endCount, setEndCount] = useState(initialRule?.end_count ?? 10);

    const buildRule = (): RecurrenceRule => ({
        frequency,
        interval,
        days_of_week: frequency === 'weekly' ? daysOfWeek : null,
        month_day: frequency === 'monthly' && monthlyMode === 'day' ? monthDay : null,
        month_week_ordinal:
            frequency === 'monthly' && monthlyMode === 'ordinal' ? monthWeekOrdinal : null,
        month_week_day:
            frequency === 'monthly' && monthlyMode === 'ordinal' ? monthWeekDay : null,
        end_date: endMode === 'date' ? endDate : null,
        end_count: endMode === 'count' ? endCount : null,
    });

    const initialSnapshot = useMemo(() => {
        const initFreq = initialRule?.frequency ?? 'weekly';
        const initInterval = initialRule?.interval ?? 1;
        const initDays = initialRule?.days_of_week ?? [defaultWeekday];
        const initMonthlyMode = initialRule?.month_week_ordinal ? 'ordinal' : 'day';
        const initMonthDay = initialRule?.month_day ?? defaultMonthDay;
        const initOrdinal = initialRule?.month_week_ordinal ?? defaultOrdinal;
        const initWeekDay = initialRule?.month_week_day ?? defaultWeekday;
        const initEndMode = initialRule?.end_date ? 'date' : initialRule?.end_count ? 'count' : 'never';
        const initEndDate = initialRule?.end_date ?? '';
        const initEndCount = initialRule?.end_count ?? 10;
        return JSON.stringify({
            initFreq, initInterval, initDays, initMonthlyMode,
            initMonthDay, initOrdinal, initWeekDay, initEndMode,
            initEndDate, initEndCount,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isDirty = (): boolean => {
        const current = JSON.stringify({
            initFreq: frequency, initInterval: interval, initDays: daysOfWeek,
            initMonthlyMode: monthlyMode, initMonthDay: monthDay,
            initOrdinal: monthWeekOrdinal, initWeekDay: monthWeekDay,
            initEndMode: endMode, initEndDate: endDate, initEndCount: endCount,
        });
        return current !== initialSnapshot;
    };

    useImperativeHandle(ref, () => ({
        isDirty,
        save: () => onSave(buildRule()),
    }));

    const handleSave = () => {
        onSave(buildRule());
    };

    const toggleDay = (day: number) => {
        setDaysOfWeek((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
        );
    };

    const frequencyLabel = (f: RecurrenceFrequency) => {
        const labels: Record<RecurrenceFrequency, string> = {
            daily: interval === 1 ? 'day' : 'days',
            weekly: interval === 1 ? 'week' : 'weeks',
            monthly: interval === 1 ? 'month' : 'months',
            yearly: interval === 1 ? 'year' : 'years',
        };
        return labels[f];
    };

    return (
        <div className="flex flex-col gap-3 px-3 py-2">
            {/* Frequency & Interval */}
            <div className="flex items-center gap-1.5">
                <Label className="shrink-0 text-xs">Every</Label>
                <Input
                    type="number"
                    min={1}
                    max={99}
                    value={interval}
                    onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-7 w-14 text-center text-xs"
                />
                <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}>
                    <SelectTrigger size="sm" className="h-7 w-24 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="daily">{frequencyLabel('daily')}</SelectItem>
                        <SelectItem value="weekly">{frequencyLabel('weekly')}</SelectItem>
                        <SelectItem value="monthly">{frequencyLabel('monthly')}</SelectItem>
                        <SelectItem value="yearly">{frequencyLabel('yearly')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Weekly: Day checkboxes */}
            {frequency === 'weekly' && (
                <div className="flex flex-col gap-1">
                    <Label className="text-xs">Repeat on</Label>
                    <div className="flex gap-1">
                        {DAY_LABELS.map((label, i) => {
                            const day = i + 1;
                            const isSelected = daysOfWeek.includes(day);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={`flex size-7 items-center justify-center rounded-full text-[10px] font-medium transition-colors ${
                                        isSelected
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-accent'
                                    }`}
                                >
                                    {label.charAt(0)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Monthly: Day vs Ordinal */}
            {frequency === 'monthly' && (
                <div className="flex flex-col gap-1.5">
                    <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                            type="radio"
                            name="monthly-mode"
                            checked={monthlyMode === 'day'}
                            onChange={() => setMonthlyMode('day')}
                            className="accent-primary"
                        />
                        <span className="text-xs">On day</span>
                        <Input
                            type="number"
                            min={1}
                            max={31}
                            value={monthDay}
                            onChange={(e) =>
                                setMonthDay(
                                    Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
                                )
                            }
                            className="h-7 w-14 text-center text-xs"
                            disabled={monthlyMode !== 'day'}
                        />
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                            type="radio"
                            name="monthly-mode"
                            checked={monthlyMode === 'ordinal'}
                            onChange={() => setMonthlyMode('ordinal')}
                            className="accent-primary"
                        />
                        <span className="shrink-0 text-xs">On the</span>
                        <Select
                            value={String(monthWeekOrdinal)}
                            onValueChange={(v) => setMonthWeekOrdinal(parseInt(v))}
                            disabled={monthlyMode !== 'ordinal'}
                        >
                            <SelectTrigger size="sm" className="h-7 w-20 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ORDINAL_LABELS.map((label, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={String(monthWeekDay)}
                            onValueChange={(v) => setMonthWeekDay(parseInt(v))}
                            disabled={monthlyMode !== 'ordinal'}
                        >
                            <SelectTrigger size="sm" className="h-7 w-20 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DAY_LABELS.map((label, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>
                </div>
            )}

            {/* End condition */}
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Ends</Label>
                <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                        type="radio"
                        name="end-mode"
                        checked={endMode === 'never'}
                        onChange={() => setEndMode('never')}
                        className="accent-primary"
                    />
                    <span className="text-xs">Never</span>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                        type="radio"
                        name="end-mode"
                        checked={endMode === 'date'}
                        onChange={() => setEndMode('date')}
                        className="accent-primary"
                    />
                    <span className="shrink-0 text-xs">On</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={endMode !== 'date'}
                        className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                    />
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                        type="radio"
                        name="end-mode"
                        checked={endMode === 'count'}
                        onChange={() => setEndMode('count')}
                        className="accent-primary"
                    />
                    <span className="shrink-0 text-xs">After</span>
                    <Input
                        type="number"
                        min={1}
                        max={999}
                        value={endCount}
                        onChange={(e) =>
                            setEndCount(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="h-7 w-14 text-center text-xs"
                        disabled={endMode !== 'count'}
                    />
                    <span className="text-xs">occurrences</span>
                </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
                {initialRule && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive"
                        onClick={onRemove}
                    >
                        Remove
                    </Button>
                )}
                <Button
                    size="sm"
                    className="ml-auto h-7 px-3 text-xs"
                    onClick={handleSave}
                >
                    Done
                </Button>
            </div>
        </div>
    );
});
