import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { RecurrenceScope } from '@/types';

interface RecurrenceScopeDialogProps {
    open: boolean;
    action: 'edit' | 'delete';
    onConfirm: (scope: RecurrenceScope) => void;
    onCancel: () => void;
}

export function RecurrenceScopeDialog({
    open,
    action,
    onConfirm,
    onCancel,
}: RecurrenceScopeDialogProps) {
    const [selected, setSelected] = useState<RecurrenceScope>('single');

    useEffect(() => {
        if (open) {
            setSelected('single');
        }
    }, [open]);

    const title = action === 'edit' ? 'Edit recurring task' : 'Delete recurring task';
    const description =
        action === 'edit'
            ? 'How would you like to apply this change?'
            : 'Which events would you like to delete?';

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) onCancel();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-accent">
                        <input
                            type="radio"
                            name="recurrence-scope"
                            value="single"
                            checked={selected === 'single'}
                            onChange={() => setSelected('single')}
                            className="accent-primary"
                        />
                        <span className="text-sm">This event</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-accent">
                        <input
                            type="radio"
                            name="recurrence-scope"
                            value="following"
                            checked={selected === 'following'}
                            onChange={() => setSelected('following')}
                            className="accent-primary"
                        />
                        <span className="text-sm">This and following events</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-accent">
                        <input
                            type="radio"
                            name="recurrence-scope"
                            value="all"
                            checked={selected === 'all'}
                            onChange={() => setSelected('all')}
                            className="accent-primary"
                        />
                        <span className="text-sm">All events</span>
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={() => onConfirm(selected)}>
                        {action === 'edit' ? 'Save' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
