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
                console.log(`\x1b[33m[AntiTagSW] Skip admin: ${senderNumber}\x1b[39m`);
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

        // Hapus pesan tag status — gunakan format exact seperti referensi
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

        // Update & simpan warning
        if (!data.warnings[remoteJid]) data.warnings[remoteJid] = {};
        if (!data.warnings[remoteJid][senderJid]) data.warnings[remoteJid][senderJid] = 0;
        data.warnings[remoteJid][senderJid] += 1;

        const newWarn = data.warnings[remoteJid][senderJid];
        const maxWarnings = antiTagSWConfig.maxWarnings ?? 3;
        saveData(data);

        if (newWarn >= maxWarnings) {
            // Reset warning lalu kick
            delete data.warnings[remoteJid][senderJid];
            saveData(data);

            await hisoka.sendMessage(remoteJid, {
                text:
                    `🚨 *「 Tag Status Terdeteksi 」*\n\n` +
                    `@${senderNumber} telah mentag grup lewat status sebanyak *${maxWarnings}x*.\n` +
                    `💥 *Dikeluarkan dari grup!*`,
                contextInfo: { mentionedJid: [senderJid] }
            });

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
            await hisoka.sendMessage(remoteJid, {
                text:
                    `⚠️ *「 Tag Status Terdeteksi 」*\n\n` +
                    `@${senderNumber}, dilarang mentag grup lewat status!\n` +
                    `📛 Peringatan ke: *${newWarn}/${maxWarnings}*`,
                contextInfo: { mentionedJid: [senderJid] }
            });

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
