/**
 * ═══════════════════════════════════════════════════════════════
 *  Anti-Tag Semua Warga (AntiTagSW) Handler
 *  Fitur untuk mencegah anggota grup mentag semua orang sekaligus
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { isJidGroup, jidNormalizedUser, areJidsSameUser, jidDecode, getContentType } = _require('socketon');

const DATA_PATH = path.join(process.cwd(), 'data', 'antitagsw.json');

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

function getOwners() {
    try {
        const config = loadConfig();
        return (config.owners || []).map(o => o + '@s.whatsapp.net');
    } catch (_) {}
    return [];
}

function getMentionsFromMessage(message) {
    if (!message) return [];
    const mentions = [];

    const contentType = getContentType(message);
    if (!contentType) return [];

    const content = message[contentType];
    if (!content) return [];

    const contextInfo = content?.contextInfo;
    if (contextInfo?.mentionedJid && Array.isArray(contextInfo.mentionedJid)) {
        mentions.push(...contextInfo.mentionedJid);
    }

    if (contextInfo?.groupMentions && Array.isArray(contextInfo.groupMentions)) {
        contextInfo.groupMentions.forEach(g => {
            if (g.groupJid) mentions.push(g.groupJid);
        });
    }

    return [...new Set(mentions.filter(Boolean))];
}

function getSenderJid(message, hisoka) {
    const remoteJid = message.key?.remoteJid;
    let sender = message.key?.participant || message.participant || message.key?.remoteJid;

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

export default async function handleAntiTagSW(message, hisoka) {
    try {
        if (!message?.key?.remoteJid) return;

        const remoteJid = message.key.remoteJid;

        if (!isJidGroup(remoteJid)) return;

        if (message.key?.fromMe) return;

        if (!message.message) return;

        const msgMentions = getMentionsFromMessage(message.message);
        if (!msgMentions.length) return;

        const config = loadConfig();
        const antiTagSWConfig = config.antiTagSW || {};

        if (!antiTagSWConfig.enabled) return;

        const minMentions = antiTagSWConfig.minMentions ?? 5;
        if (msgMentions.length < minMentions) return;

        const data = loadData();

        if (!data.groups.includes(remoteJid)) return;

        const senderJid = getSenderJid(message, hisoka);
        if (!senderJid) return;

        const senderNumber = jidDecode(senderJid)?.user || '';

        const owners = getOwners();
        const isOwner = owners.some(o => areJidsSameUser(o, senderJid)) ||
            (config.owners || []).some(o => senderNumber === o);
        if (isOwner) return;

        const botJid = jidNormalizedUser(hisoka.user?.id || '');
        if (areJidsSameUser(senderJid, botJid)) return;

        let groupMeta = null;
        try {
            groupMeta = hisoka.groups?.read(remoteJid);
            if (!groupMeta || !groupMeta.participants) {
                groupMeta = await hisoka.groupMetadata(remoteJid);
            }
        } catch (_) {
            try {
                groupMeta = await hisoka.groupMetadata(remoteJid);
            } catch (_2) {}
        }

        if (groupMeta?.participants) {
            const senderParticipant = groupMeta.participants.find(p =>
                areJidsSameUser(p.phoneNumber || p.id, senderJid) ||
                areJidsSameUser(p.lid, senderJid)
            );
            if (senderParticipant?.admin) return;

            const botParticipant = groupMeta.participants.find(p =>
                areJidsSameUser(p.phoneNumber || p.id, botJid)
            );
            if (!botParticipant?.admin) {
                console.log('\x1b[33m[AntiTagSW] Bot bukan admin, tidak bisa hapus/kick.\x1b[39m');
                return;
            }
        }

        try {
            await hisoka.sendMessage(remoteJid, { delete: message.key });
        } catch (delErr) {
            console.error('\x1b[31m[AntiTagSW] Gagal hapus pesan:\x1b[39m', delErr.message);
        }

        if (!data.warnings[remoteJid]) data.warnings[remoteJid] = {};
        const prevWarn = data.warnings[remoteJid][senderJid] || 0;
        const newWarn = prevWarn + 1;
        data.warnings[remoteJid][senderJid] = newWarn;
        saveData(data);

        const maxWarnings = antiTagSWConfig.maxWarnings ?? 3;
        const senderName = hisoka.getName?.(senderJid) || senderNumber;

        if (newWarn >= maxWarnings) {
            data.warnings[remoteJid][senderJid] = 0;
            saveData(data);

            const kickMsg =
                `╭───〔 *⛔ ANTI-TAG SEMUA WARGA* 〕───╮\n` +
                `│\n` +
                `│ 🚨 *Pelanggaran Berat!*\n` +
                `│ @${senderNumber} telah di-kick!\n` +
                `│\n` +
                `│ 📛 *Alasan:* Mentag terlalu banyak\n` +
                `│    anggota (${msgMentions.length} orang)\n` +
                `│\n` +
                `│ ⚠️ Peringatan: ${maxWarnings}/${maxWarnings}\n` +
                `│\n` +
                `╰─────────────────────────────────╯`;

            await hisoka.sendMessage(remoteJid, {
                text: kickMsg,
                mentions: [senderJid]
            });

            try {
                await hisoka.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
                console.log(`\x1b[31m[AntiTagSW] Kicked ${senderNumber} dari ${remoteJid}\x1b[39m`);
            } catch (kickErr) {
                console.error('\x1b[31m[AntiTagSW] Gagal kick:\x1b[39m', kickErr.message);
                await hisoka.sendMessage(remoteJid, {
                    text: `❌ Gagal kick @${senderNumber}. Pastikan bot adalah admin grup.`,
                    mentions: [senderJid]
                });
            }
        } else {
            const warnMsg =
                `╭───〔 *⚠️ ANTI-TAG SEMUA WARGA* 〕───╮\n` +
                `│\n` +
                `│ 🚫 *Peringatan ${newWarn}/${maxWarnings}*\n` +
                `│ @${senderNumber}\n` +
                `│\n` +
                `│ ❌ Kamu mentag *${msgMentions.length} orang*\n` +
                `│    sekaligus, pesan dihapus!\n` +
                `│\n` +
                `│ ⚠️ Jika sampai ${maxWarnings}x akan di-kick!\n` +
                `│\n` +
                `╰─────────────────────────────────╯`;

            await hisoka.sendMessage(remoteJid, {
                text: warnMsg,
                mentions: [senderJid]
            });

            console.log(`\x1b[33m[AntiTagSW] Warn ${newWarn}/${maxWarnings} - ${senderNumber} di ${remoteJid}\x1b[39m`);
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
