/**
 * Shared in-memory cache for received WhatsApp status/story entries.
 * Stored per session (resets on bot restart).
 */

const MAX_ENTRIES = 200;

const swEntries = [];

function formatBytes(bytes) {
        if (!bytes || bytes === 0) return 'N/A';
        const b = Number(bytes);
        if (b < 1024) return `${b} B`;
        if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
        return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function getTypeInfo(type) {
        const map = {
                imageMessage: { emoji: '🖼️', label: 'Image' },
                videoMessage: { emoji: '🎥', label: 'Video' },
                audioMessage: { emoji: '🎵', label: 'Audio' },
                documentMessage: { emoji: '📄', label: 'Dokumen' },
                extendedTextMessage: { emoji: '💬', label: 'Teks' },
                conversation: { emoji: '💬', label: 'Teks' },
        };
        return map[type] || { emoji: '📎', label: type?.replace('Message', '') || 'Unknown' };
}

export function addSwEntry(entry) {
        swEntries.unshift(entry);
        if (swEntries.length > MAX_ENTRIES) swEntries.pop();
}

export function getSwEntries() {
        return [...swEntries];
}

export function clearSwEntries() {
        swEntries.length = 0;
}

export { formatBytes, getTypeInfo };
