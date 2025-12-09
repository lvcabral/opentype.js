export function argument(condition, message) {
    if (!condition) {
        throw new Error(message || 'Check failed');
    }
}

export default { argument };
