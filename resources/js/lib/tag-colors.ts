export const tagColors: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
    red: {
        bg: 'bg-red-100 dark:bg-red-950/40',
        text: 'text-red-700 dark:text-red-400',
        dot: 'bg-red-500',
        ring: 'ring-red-500/20',
    },
    orange: {
        bg: 'bg-orange-100 dark:bg-orange-950/40',
        text: 'text-orange-700 dark:text-orange-400',
        dot: 'bg-orange-500',
        ring: 'ring-orange-500/20',
    },
    amber: {
        bg: 'bg-amber-100 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-500',
        ring: 'ring-amber-500/20',
    },
    green: {
        bg: 'bg-green-100 dark:bg-green-950/40',
        text: 'text-green-700 dark:text-green-400',
        dot: 'bg-green-500',
        ring: 'ring-green-500/20',
    },
    teal: {
        bg: 'bg-teal-100 dark:bg-teal-950/40',
        text: 'text-teal-700 dark:text-teal-400',
        dot: 'bg-teal-500',
        ring: 'ring-teal-500/20',
    },
    blue: {
        bg: 'bg-blue-100 dark:bg-blue-950/40',
        text: 'text-blue-700 dark:text-blue-400',
        dot: 'bg-blue-500',
        ring: 'ring-blue-500/20',
    },
    violet: {
        bg: 'bg-violet-100 dark:bg-violet-950/40',
        text: 'text-violet-700 dark:text-violet-400',
        dot: 'bg-violet-500',
        ring: 'ring-violet-500/20',
    },
    pink: {
        bg: 'bg-pink-100 dark:bg-pink-950/40',
        text: 'text-pink-700 dark:text-pink-400',
        dot: 'bg-pink-500',
        ring: 'ring-pink-500/20',
    },
    gray: {
        bg: 'bg-gray-100 dark:bg-gray-800/40',
        text: 'text-gray-700 dark:text-gray-400',
        dot: 'bg-gray-500',
        ring: 'ring-gray-500/20',
    },
};

export const tagColorKeys = Object.keys(tagColors);
