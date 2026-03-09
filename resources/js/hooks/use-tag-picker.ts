import { useCallback, useEffect, useState } from 'react';

interface UseTagPickerReturn {
    isOpen: boolean;
    searchQuery: string;
    close: () => void;
    removeHashText: (inputValue: string) => string;
}

export function useTagPicker(inputValue: string): UseTagPickerReturn {
    const [isOpen, setIsOpen] = useState(false);
    const [hashPosition, setHashPosition] = useState(-1);

    useEffect(() => {
        const lastHash = inputValue.lastIndexOf('#');

        if (lastHash === -1) {
            setIsOpen(false);
            setHashPosition(-1);
            return;
        }

        const beforeHash = inputValue[lastHash - 1];
        if (lastHash > 0 && beforeHash !== ' ') {
            return;
        }

        const afterHash = inputValue.substring(lastHash + 1);
        if (afterHash.includes(' ')) {
            setIsOpen(false);
            setHashPosition(-1);
            return;
        }

        setIsOpen(true);
        setHashPosition(lastHash);
    }, [inputValue]);

    const searchQuery = isOpen && hashPosition >= 0 ? inputValue.substring(hashPosition + 1) : '';

    const close = useCallback(() => {
        setIsOpen(false);
        setHashPosition(-1);
    }, []);

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
