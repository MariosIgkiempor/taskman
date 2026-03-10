import { useRef } from 'react';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';

interface TaskFormProps {
    onOpen: (anchorRect: DOMRect) => void;
}

export function TaskForm({ onOpen }: TaskFormProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        if (inputRef.current) {
            onOpen(inputRef.current.getBoundingClientRect());
        }
    };

    return (
        <div>
            <InputGroup>
                <InputGroupInput
                    ref={inputRef}
                    placeholder="Add a task... (# for tags)"
                    readOnly
                    className="cursor-pointer"
                    onClick={handleClick}
                />
            </InputGroup>
        </div>
    );
}
