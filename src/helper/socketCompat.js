'use strict';

import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const socketon = _require('socketon');

export const isPnUser = (jid) => typeof jid === 'string' && jid.endsWith('@pn');

export const isLidUser = socketon.isLidUser || ((jid) => typeof jid === 'string' && jid.endsWith('@lid'));

export const areJidsSameUser = socketon.areJidsSameUser;
export const generateWAMessageFromContent = socketon.generateWAMessageFromContent;
export const getContentType = socketon.getContentType;
export const isJidGroup = socketon.isJidGroup;
export const isJidStatusBroadcast = socketon.isJidStatusBroadcast;
export const jidDecode = socketon.jidDecode;
export const jidNormalizedUser = socketon.jidNormalizedUser;
export const downloadMediaMessage = socketon.downloadMediaMessage;
export const generateMessageIDV2 = socketon.generateMessageIDV2;
export const toNumber = socketon.toNumber;
export const proto = socketon.proto || socketon.WAProto?.proto;
export const delay = socketon.delay;
export const extractMessageContent = socketon.extractMessageContent;

export const safeGetPNForLID = async (sock, jid) => {
    try {
        if (!jid || !sock?.signalRepository?.lidMapping?.getPNForLID) return jid;
        return (await sock.signalRepository.lidMapping.getPNForLID(jid)) || jid;
    } catch {
        return jid;
    }
};
