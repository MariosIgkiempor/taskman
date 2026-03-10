import { useCallback, useMemo, useState } from 'react';

interface UseTagPickerReturn {
    isOpen: boolean;
    searchQuery: string;
    close: () => void;
    removeHashText: (inputValue: string) => string;
}

export function useTagPicker(inputValue: string): UseTagPickerReturn {
    const [closedForValue, setClosedForValue] = useState<string | null>(null);

    const { derivedOpen, hashPosition } = useMemo(() => {
        const lastHash = inputValue.lastIndexOf('#');

        if (lastHash === -1) {
            return { derivedOpen: false, hashPosition: -1 };
        }

        const beforeHash = inputValue[lastHash - 1];
        if (lastHash > 0 && beforeHash !== ' ') {
            return { derivedOpen: false, hashPosition: -1 };
        }

        const afterHash = inputValue.substring(lastHash + 1);
        if (afterHash.includes(' ')) {
            return { derivedOpen: false, hashPosition: -1 };
        }

        return { derivedOpen: true, hashPosition: lastHash };
    }, [inputValue]);

    const isOpen = derivedOpen && closedForValue !== inputValue;
    const searchQuery =
        isOpen && hashPosition >= 0
            ? inputValue.substring(hashPosition + 1)
            : '';

    const close = useCallback(() => {
        setClosedForValue(inputValue);
    }, [inputValue]);

    const removeHashText = useCallback(
        (value: string): string => {
            if (hashPosition < 0) {
                return value;
            }
            return value.substring(0, hashPosition).trimEnd();
        },
        [hashPosition],
    );

    return { isOpen, searchQuery, close, removeHashText };
}
