'use strict';

import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'tmp', 'swcache');
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 jam (sesuai masa berlaku status WA)
const MAX_ENTRIES = 200;

function ensureDir() {
        if (!fs.existsSync(CACHE_DIR)) {
                fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
}

function entryPath(id) {
        return path.join(CACHE_DIR, `${id}.json`);
}

// Buat ID unik dari key message
function makeId(entry) {
        const keyId = entry.key?.id || String(Date.now());
        // Sanitize biar aman jadi nama file
        return keyId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
}

// Load semua entry dari disk (dipanggil saat modul pertama kali dimuat)
function loadFromDisk() {
        ensureDir();
        const now = Date.now();
        const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
        const entries = [];

        for (const file of files) {
                try {
                        const raw = fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8');
                        const entry = JSON.parse(raw);
                        // Buang yang sudah kadaluwarsa
                        if (now - entry.timestamp > MAX_AGE_MS) {
                                fs.unlinkSync(path.join(CACHE_DIR, file));
                                continue;
                        }
                        entries.push(entry);
                } catch {}
        }

        // Urutkan terbaru dulu
        entries.sort((a, b) => b.timestamp - a.timestamp);
        return entries;
}

// In-memory cache (diisi dari disk saat startup)
const swEntries = loadFromDisk();

export function addSwEntry(entry) {
        ensureDir();
        const now = Date.now();

        // Cek duplikat berdasarkan key.id
        const keyId = entry.key?.id;
        if (keyId && swEntries.some(e => e.key?.id === keyId)) return;

        swEntries.unshift(entry);

        // Buang yang melebihi batas
        while (swEntries.length > MAX_ENTRIES) swEntries.pop();

        // Simpan ke disk
        try {
                const id = makeId(entry);
                fs.writeFileSync(entryPath(id), JSON.stringify(entry));
        } catch (err) {
                console.error('\x1b[31m[SWCache] Gagal simpan:\x1b[0m', err.message);
        }
}

export function getSwEntries() {
        const now = Date.now();
        // Filter real-time: hanya yang masih dalam 24 jam
        return swEntries.filter(e => now - e.timestamp < MAX_AGE_MS);
}

export function clearSwEntries() {
        swEntries.length = 0;
        try {
                const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
                for (const f of files) fs.unlinkSync(path.join(CACHE_DIR, f));
        } catch {}
}

// Cleanup file kadaluwarsa dari disk (dipanggil berkala)
export function cleanOldSwCache() {
        try {
                ensureDir();
                const now = Date.now();
                const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
                let deleted = 0;
                for (const file of files) {
                        try {
                                const raw = fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8');
                                const entry = JSON.parse(raw);
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
