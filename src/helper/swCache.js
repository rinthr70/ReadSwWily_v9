'use strict';

import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'tmp', 'swcache');
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

// ─── Long (protobuf int64) → number ──────────────────────────────────────────
function longToNumber(val) {
        if (val == null) return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'bigint') return Number(val);
        // Long object: { low, high, unsigned }
        if (typeof val === 'object' && ('low' in val || 'high' in val)) {
                const lo = (val.low >>> 0);
                const hi = (val.high >>> 0);
                return hi * 4294967296 + lo;
        }
        return Number(val) || 0;
}

// ─── Buffer-safe JSON serializer / deserializer ───────────────────────────────
function safeReplacer(key, val) {
        // Buffer (Node.js) → {__buf: "base64"}
        if (val && typeof val === 'object' && val.type === 'Buffer' && Array.isArray(val.data)) {
                return { __buf: Buffer.from(val.data).toString('base64') };
        }
        // Buffer instance (non-toJSON path)
        if (Buffer.isBuffer(val)) {
                return { __buf: val.toString('base64') };
        }
        // Long object
        if (val && typeof val === 'object' && typeof val.low === 'number' && typeof val.high === 'number') {
                return longToNumber(val);
        }
        return val;
}

function safeReviver(key, val) {
        // Restore Buffer
        if (val && typeof val === 'object' && typeof val.__buf === 'string') {
                return Buffer.from(val.__buf, 'base64');
        }
        return val;
}

function safeStringify(obj) {
        return JSON.stringify(obj, safeReplacer);
}

function safeParse(str) {
        return JSON.parse(str, safeReviver);
}

// ─── Disk helpers ─────────────────────────────────────────────────────────────
function ensureDir() {
        if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function makeFileId(entry) {
        const keyId = entry.key?.id || String(Date.now());
        return keyId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

function entryPath(id) {
        return path.join(CACHE_DIR, `${id}.json`);
}

// ─── Load dari disk saat startup ─────────────────────────────────────────────
function loadFromDisk() {
        ensureDir();
        const now = Date.now();
        const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
        const entries = [];

        for (const file of files) {
                try {
                        const raw = fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8');
                        const entry = safeParse(raw);
                        if (now - entry.timestamp > MAX_AGE_MS) {
                                fs.unlinkSync(path.join(CACHE_DIR, file));
                                continue;
                        }
                        // Pastikan fileLength selalu number
                        entry.fileLength = longToNumber(entry.fileLength);
                        entries.push(entry);
                } catch {}
        }

        entries.sort((a, b) => b.timestamp - a.timestamp);
        return entries;
}

// In-memory cache
const swEntries = loadFromDisk();

// ─── Public API ───────────────────────────────────────────────────────────────
export function addSwEntry(entry) {
        ensureDir();
        const now = Date.now();

        // Deduplikasi
        const keyId = entry.key?.id;
        if (keyId && swEntries.some(e => e.key?.id === keyId)) return;

        // Normalisasi fileLength ke number sebelum simpan
        entry.fileLength = longToNumber(entry.fileLength);

        swEntries.unshift(entry);
        while (swEntries.length > MAX_ENTRIES) swEntries.pop();

        // Simpan ke disk (Buffer-safe)
        try {
                const id = makeFileId(entry);
                fs.writeFileSync(entryPath(id), safeStringify(entry));
        } catch (err) {
                console.error('\x1b[31m[SWCache] Gagal simpan:\x1b[0m', err.message);
        }
}

export function getSwEntries() {
        const now = Date.now();
        return swEntries.filter(e => now - e.timestamp < MAX_AGE_MS);
}

export function clearSwEntries() {
        swEntries.length = 0;
        try {
                const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
                for (const f of files) fs.unlinkSync(path.join(CACHE_DIR, f));
        } catch {}
}

export function cleanOldSwCache() {
        try {
                ensureDir();
                const now = Date.now();
                const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
                let deleted = 0;
                for (const file of files) {
                        try {
                                const raw = fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8');
                                const entry = safeParse(raw);
                                if (now - entry.timestamp > MAX_AGE_MS) {
                                        fs.unlinkSync(path.join(CACHE_DIR, file));
                                        deleted++;
                                }
                        } catch {
                                try { fs.unlinkSync(path.join(CACHE_DIR, file)); } catch {}
                                deleted++;
                        }
                }
                if (deleted > 0) console.log(`\x1b[36m[SWCache]\x1b[0m Cleanup: ${deleted} cache kadaluwarsa dihapus`);
        } catch (err) {
                console.error('\x1b[31m[SWCache] Cleanup error:\x1b[0m', err.message);
        }
}

export function formatBytes(bytes) {
        if (!bytes || bytes === 0) return 'N/A';
        const b = Number(bytes);
        if (isNaN(b) || b === 0) return 'N/A';
        if (b < 1024) return `${b} B`;
        if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
        return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export function getTypeInfo(type) {
        const map = {
                imageMessage:        { emoji: '🖼️', label: 'Image' },
                videoMessage:        { emoji: '🎥', label: 'Video' },
                audioMessage:        { emoji: '🎵', label: 'Audio' },
                documentMessage:     { emoji: '📄', label: 'Dokumen' },
                extendedTextMessage: { emoji: '💬', label: 'Teks' },
                conversation:        { emoji: '💬', label: 'Teks' },
        };
        return map[type] || { emoji: '📎', label: (type || 'Unknown').replace('Message', '') };
}
