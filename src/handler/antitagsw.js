/**
 * ═══════════════════════════════════════════════════════════════
 *  Anti-Tag Semua Warga (AntiTagSW) Handler
 *  Fitur untuk mencegah anggota mentag grup lewat status WhatsApp
 *  Referensi: github.com/hitlabmodv2/MD-FURINA
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { isJidGroup, jidNormalizedUser, areJidsSameUser, jidDecode, getContentType } = _require('socketon');

const DATA_PATH = path.join(process.cwd(), 'data', 'antitagsw.json');

// Set global untuk menandai pesan yang dihapus oleh antitagsw
// agar anti-delete tidak mengirim notifikasi "PESAN DIHAPUS"
if (!global.__antiTagSWDeletedIds) global.__antiTagSWDeletedIds = new Set();

// Mapping tipe konten status → label + emoji
const CONTENT_TYPE_MAP = {
    imageMessage:         ['Gambar', '🖼️'],
    videoMessage:         ['Video', '🎥'],
    audioMessage:         ['Audio', '🎵'],
    ptvMessage:           ['Video Pesan', '📹'],
    stickerMessage:       ['Stiker', '🎨'],
    documentMessage:      ['Dokumen', '📄'],
    documentWithCaptionMessage: ['Dokumen', '📄'],
    conversation:         ['Teks', '💬'],
    extendedTextMessage:  ['Teks', '💬'],
    reactionMessage:      ['Reaksi', '🔥'],
    pollCreationMessage:  ['Polling', '📊'],
    pollCreationMessageV2: ['Polling', '📊'],
    pollCreationMessageV3: ['Polling', '📊'],
};

function detectStatusContentType(message) {
    try {
        const msg = message?.message || {};

        // Cek inner message dari groupStatusMentionMessage / groupStatusMessageV2
        const inner = msg?.groupStatusMentionMessage?.message
            || msg?.groupStatusMessageV2?.message
            || msg?.groupMentionedMessage?.message
            || msg;

        // Cari tipe pertama yang ada
        for (const [key, val] of Object.entries(CONTENT_TYPE_MAP)) {
            if (inner[key]) return val;
        }

        // Fallback: cek pakai getContentType di level dalam
        const innerType = getContentType(inner);
        if (innerType && CONTENT_TYPE_MAP[innerType]) return CONTENT_TYPE_MAP[innerType];
    } catch (_) {}
    return ['Status', '📲'];
}

// Tipe pesan yang terdeteksi sebagai "tag grup lewat status"
const ANTITAG_MSG_TYPES = [
    'groupStatusMentionMessage',
    'groupStatusMessageV2',
    'groupMentionedMessage',
];

function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
    } catch (_) {}
    return {};
}

function loadData() {
    try {
        if (fs.existsSync(DATA_PATH)) {
            return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
        }
    } catch (_) {}
    return { groups: [], warnings: {} };
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('\x1b[31m[AntiTagSW] Gagal simpan data:\x1b[39m', err.message);
    }
}

function getSenderJid(message, hisoka) {
    let sender = message.key?.participant || message.participant;

    if (!sender) return null;

    if (sender.includes('@lid')) {
        try {
            const contacts = hisoka.contacts;
            if (contacts) {
                const contact = contacts.find(c => areJidsSameUser(c.lid, sender));
                if (contact?.id) return jidNormalizedUser(contact.id);
                if (contact?.phoneNumber) return jidNormalizedUser(contact.phoneNumber);
            }
        } catch (_) {}
    }

    return jidNormalizedUser(sender);
}

function isOwnerJid(senderJid, senderNumber, config) {
    const owners = (config.owners || []);
    const ownerJids = owners.map(o => o + '@s.whatsapp.net');
    return ownerJids.some(o => areJidsSameUser(o, senderJid)) ||
        owners.some(o => senderNumber === o);
}

export default async function handleAntiTagSW(message, hisoka) {
    try {
        if (!message?.key?.remoteJid) return;
        if (!message.message) return;

        const remoteJid = message.key.remoteJid;

        if (!isJidGroup(remoteJid)) return;
        if (message.key?.fromMe) return;

        // Cek tipe pesan — hanya proses tag status
        const msgType = getContentType(message.message);
        if (!msgType) return;

        const isTagStatus = ANTITAG_MSG_TYPES.includes(msgType);
        if (!isTagStatus) return;

        // Cek config global
        const config = loadConfig();
        const antiTagSWConfig = config.antiTagSW || {};
        if (!antiTagSWConfig.enabled) return;

        // Cek apakah grup ini mengaktifkan antitagsw
        const data = loadData();
        if (!data.groups.includes(remoteJid)) return;

        const senderJid = getSenderJid(message, hisoka);
        if (!senderJid) return;

        const senderNumber = jidDecode(senderJid)?.user || senderJid.split('@')[0] || '';

        // Skip owner
        if (isOwnerJid(senderJid, senderNumber, config)) return;

        // Skip bot sendiri
        const botJid = jidNormalizedUser(hisoka.user?.id || '');
        if (areJidsSameUser(senderJid, botJid)) return;

        // Cek apakah sender admin & bot adalah admin
        let groupMeta = null;
        try {
            groupMeta = hisoka.groups?.read(remoteJid);
            if (!groupMeta?.participants?.length) {
                groupMeta = await hisoka.groupMetadata(remoteJid);
            }
        } catch (_) {
            try { groupMeta = await hisoka.groupMetadata(remoteJid); } catch (_2) {}
        }

        if (groupMeta?.participants) {
            const senderParticipant = groupMeta.participants.find(p =>
                areJidsSameUser(p.phoneNumber || p.id, senderJid) ||
                areJidsSameUser(p.lid, senderJid)
            );
            if (senderParticipant?.admin) {
                console.log(`\x1b[33m[AntiTagSW] Admin tag SW: ${senderNumber} — balas + reaksi\x1b[39m`);
                try {
                    const [aContentLabel, aContentEmoji] = detectStatusContentType(message);
                    const aNow = new Date();
                    const aTimeStr = aNow.toLocaleTimeString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                    const aDateStr = aNow.toLocaleDateString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit', month: '2-digit', year: 'numeric'
                    });

                    const adminMsg =
                        `╭─────────────────────────────╮\n` +
                        `│   👑 *TAG STATUS ADMIN* 👑   │\n` +
                        `╰─────────────────────────────╯\n` +
                        `\n` +
                        `👤 *Admin:* @${senderNumber}\n` +
                        `📅 *Waktu:* ${aTimeStr} • ${aDateStr}\n` +
                        `${aContentEmoji} *Tipe Konten:* ${aContentLabel}\n` +
                        `\n` +
                        `┌─────────────────────────────\n` +
                        `│ ✅ Admin diizinkan mentag\n` +
                        `│    grup lewat STATUS WA.\n` +
                        `│ 🔔 Anggota telah diberitahu!\n` +
                        `└─────────────────────────────\n` +
                        `\n` +
                        `_Terimakasih telah aktif mengelola grup!_ 🙏`;

                    await hisoka.sendMessage(remoteJid, {
                        text: adminMsg,
                        contextInfo: { mentionedJid: [senderJid] }
                    }, { quoted: message });

                    await hisoka.sendMessage(remoteJid, {
                        react: { text: '👑', key: message.key }
                    });
                } catch (_) {}
                return;
            }

            const botParticipant = groupMeta.participants.find(p =>
                areJidsSameUser(p.phoneNumber || p.id, botJid)
            );
            if (!botParticipant?.admin) {
                console.log('\x1b[33m[AntiTagSW] Bot bukan admin, tidak bisa hapus/kick.\x1b[39m');
                return;
            }
        }

        console.log(`\x1b[33m[AntiTagSW] Terdeteksi! Type: ${msgType} | Sender: ${senderNumber} | Grup: ${remoteJid}\x1b[39m`);

        // Update & simpan warning dulu
        if (!data.warnings[remoteJid]) data.warnings[remoteJid] = {};
        if (!data.warnings[remoteJid][senderJid]) data.warnings[remoteJid][senderJid] = 0;
        data.warnings[remoteJid][senderJid] += 1;

        const newWarn = data.warnings[remoteJid][senderJid];
        const maxWarnings = antiTagSWConfig.maxWarnings ?? 3;
        saveData(data);

        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const dateStr = now.toLocaleDateString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        // Deteksi tipe konten status secara realtime
        const [contentLabel, contentEmoji] = detectStatusContentType(message);

        if (newWarn >= maxWarnings) {
            // Reset warning
            delete data.warnings[remoteJid][senderJid];
            saveData(data);

            const kickMsg =
                `╭─────────────────────────────╮\n` +
                `│   ⛔ *ANTI-TAG STATUS* ⛔    │\n` +
                `╰─────────────────────────────╯\n` +
                `\n` +
                `👤 *Pelanggar:* @${senderNumber}\n` +
                `📅 *Waktu:* ${timeStr} • ${dateStr}\n` +
                `${contentEmoji} *Tipe Konten:* ${contentLabel}\n` +
                `\n` +
                `┌─────────────────────────────\n` +
                `│ ⚠️  *Pelanggaran Terdeteksi*\n` +
                `│ Mentag grup lewat STATUS WA\n` +
                `└─────────────────────────────\n` +
                `\n` +
                `🚫 *Peringatan:* ${maxWarnings}/${maxWarnings}\n` +
                `💥 *Status:* Telah di-*KICK* dari grup!\n` +
                `\n` +
                `_Jangan ulangi perbuatan ini di grup lain!_`;

            // Reply dulu ke pesan pelanggar, baru hapus
            await hisoka.sendMessage(remoteJid, {
                text: kickMsg,
                contextInfo: { mentionedJid: [senderJid] }
            }, { quoted: message });

            // Tandai ID agar anti-delete tidak notif "PESAN DIHAPUS"
            global.__antiTagSWDeletedIds.add(message.key.id);
            setTimeout(() => global.__antiTagSWDeletedIds.delete(message.key.id), 10000);

            // Hapus pesan tag status
            try {
                await hisoka.sendMessage(remoteJid, {
                    delete: {
                        remoteJid: remoteJid,
                        fromMe: false,
                        id: message.key.id,
                        participant: message.key.participant
                    }
                });
            } catch (delErr) {
                console.error('\x1b[31m[AntiTagSW] Gagal hapus pesan:\x1b[39m', delErr.message);
            }

            try {
                await hisoka.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
                console.log(`\x1b[31m[AntiTagSW] ✓ Kicked ${senderNumber} dari ${remoteJid}\x1b[39m`);
            } catch (kickErr) {
                console.error('\x1b[31m[AntiTagSW] Gagal kick:\x1b[39m', kickErr.message);
                await hisoka.sendMessage(remoteJid, {
                    text: `❌ Gagal kick @${senderNumber}. Pastikan bot adalah admin grup.`,
                    contextInfo: { mentionedJid: [senderJid] }
                });
            }
        } else {
            // Isi bar peringatan
            const filled = '▰'.repeat(newWarn);
            const empty = '▱'.repeat(maxWarnings - newWarn);
            const bar = filled + empty;

            const warnMsg =
                `╭─────────────────────────────╮\n` +
                `│   ⚠️ *ANTI-TAG STATUS* ⚠️   │\n` +
                `╰─────────────────────────────╯\n` +
                `\n` +
                `👤 *Pelanggar:* @${senderNumber}\n` +
                `📅 *Waktu:* ${timeStr} • ${dateStr}\n` +
                `${contentEmoji} *Tipe Konten:* ${contentLabel}\n` +
                `\n` +
                `┌─────────────────────────────\n` +
                `│ 🚫 Dilarang mentag grup\n` +
                `│    lewat *STATUS WhatsApp!*\n` +
                `│ 🗑️  Pesan telah dihapus.\n` +
                `└─────────────────────────────\n` +
                `\n` +
                `📊 *Peringatan:* ${bar} ${newWarn}/${maxWarnings}\n` +
                `\n` +
                `_${newWarn >= maxWarnings - 1 ? '⚠️ Peringatan berikutnya = KICK!' : `Sisa ${maxWarnings - newWarn}x lagi sebelum di-kick!`}_`;

            // Reply dulu ke pesan pelanggar, baru hapus
            await hisoka.sendMessage(remoteJid, {
                text: warnMsg,
                contextInfo: { mentionedJid: [senderJid] }
            }, { quoted: message });

            // Tandai ID agar anti-delete tidak notif "PESAN DIHAPUS"
            global.__antiTagSWDeletedIds.add(message.key.id);
            setTimeout(() => global.__antiTagSWDeletedIds.delete(message.key.id), 10000);

            // Hapus pesan tag status
            try {
                await hisoka.sendMessage(remoteJid, {
                    delete: {
                        remoteJid: remoteJid,
                        fromMe: false,
                        id: message.key.id,
                        participant: message.key.participant
                    }
                });
            } catch (delErr) {
                console.error('\x1b[31m[AntiTagSW] Gagal hapus pesan:\x1b[39m', delErr.message);
            }

            console.log(`\x1b[33m[AntiTagSW] Warn ${newWarn}/${maxWarnings} - ${senderNumber}\x1b[39m`);
        }
    } catch (err) {
        console.error('\x1b[31m[AntiTagSW] Error:\x1b[39m', err.message);
    }
}

export function isAntiTagSWEnabled(groupId) {
    const data = loadData();
    return data.groups.includes(groupId);
}

export function toggleAntiTagSW(groupId, enable) {
    const data = loadData();
    if (enable) {
        if (!data.groups.includes(groupId)) {
            data.groups.push(groupId);
        }
    } else {
        data.groups = data.groups.filter(g => g !== groupId);
        if (data.warnings[groupId]) {
            delete data.warnings[groupId];
        }
    }
    saveData(data);
    return data;
}

export function resetWarnings(groupId, userJid) {
    const data = loadData();
    if (!data.warnings[groupId]) return;
    if (userJid) {
        delete data.warnings[groupId][userJid];
    } else {
        delete data.warnings[groupId];
    }
    saveData(data);
}

export function getWarnings(groupId) {
    const data = loadData();
    return data.warnings[groupId] || {};
}
