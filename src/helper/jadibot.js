'use strict'

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidNormalizedUser,
  delay
} from 'baileys'

import fs from 'fs'
import path from 'path'
import pino from 'pino'
import { getRandomEmoji } from '../helper/emoji.js'
import { injectClient } from '../helper/inject.js'
import messageHandler from '../handler/message.js'
import JSONDB from '../db/json.js'

/* ================= LOGGER ================= */
const silentLogger = pino({ level: 'silent' })
/* ================= STATE ================= */
const jadibotMap = new Map()
const pairingRequested = new Set()
const stoppingJadibot = new Set()
const pairingTimeout = new Map()
const pairingResent = new Set()

/* ================= UTILS ================= */
function loadConfig() {
  try {
    const p = path.join(process.cwd(), 'config.json')
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch {}
  return {}
}

function maskNumber(num) {
  const n = num.replace(/[^0-9]/g, '')
  if (n.length <= 6) return n
  return n.slice(0, 4) + '****' + n.slice(-4)
}

function isSessionValid(sessionDir) {
  return fs.existsSync(path.join(sessionDir, 'creds.json'))
}

/* ================= START JADIBOT ================= */
async function startJadibot(number, sendReply, mainBotNumber) {
  number = number.replace(/[^0-9]/g, '')
  const sessionDir = path.join(process.cwd(), 'jadibot', number)

  fs.mkdirSync(sessionDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: silentLogger,
    printQRInTerminal: false
  })

  sock.isMainBot = false
  sock.mainBotNumber = mainBotNumber

  injectClient(
    sock,
    new Map(),
    new JSONDB('contacts', sessionDir),
    new JSONDB('groups', sessionDir),
    new JSONDB('settings', sessionDir)
  )

  sock.ev.on('creds.update', saveCreds)

  /* ================= CONNECTION ================= */
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    const reason = lastDisconnect?.error?.output?.statusCode

    /* ===== PAIRING CODE (AUTO RESET 60 DETIK) ===== */
if (
  connection === 'connecting' &&
  !state.creds?.registered &&
  !pairingRequested.has(number)
) {
  pairingRequested.add(number)

  setTimeout(async () => {
    try {
      const code = await sock.requestPairingCode(number)
      await sendReply(
        `🔗 *JADIBOT*\n\nKode Pairing:\n*${code}*\n\n⏳ Berlaku 60 detik\nWhatsApp → Perangkat Tertaut`
      )
    } catch {}
  }, 1200)

  // ⏱️ AUTO RESET (60 DETIK) + RESEND 1x
const timeout = setTimeout(async () => {
  if (!state.creds?.registered) {
    pairingRequested.delete(number)
    pairingTimeout.delete(number)

    if (pairingResent.has(number)) {
      console.log(`[JADIBOT] Pairing expired ${number}, stop resend`)
      return
    }

    pairingResent.add(number)
    console.log(`[JADIBOT] Pairing expired ${number}, resend once`)

    try {
      const code = await sock.requestPairingCode(number)
      await sendReply(
        `🔗 *JADIBOT*\n\nKode Pairing (Terakhir):\n*${code}*\n\n⏳ Berlaku 60 detik\nJika habis, ketik .jadibot ulang`
      )
    } catch {}
  }
}, 60 * 1000)

pairingTimeout.set(number, timeout)
}

    /* ===== CONNECTED ===== */
    if (connection === 'open') {
  jadibotMap.set(number, sock)
  pairingRequested.delete(number)
  pairingResent.delete(number)

  if (pairingTimeout.has(number)) {
    clearTimeout(pairingTimeout.get(number))
    pairingTimeout.delete(number)
  }

  console.log(`[JADIBOT] ${number} CONNECTED`)
}

    /* ===== DISCONNECTED ===== */
    if (connection === 'close') {

  if (pairingTimeout.has(number)) {
    clearTimeout(pairingTimeout.get(number))
    pairingTimeout.delete(number)
  }

  pairingRequested.delete(number)
  pairingResent.delete(number)

      /* STOP MANUAL DARI BOT UTAMA */
      if (stoppingJadibot.has(number)) {
        stoppingJadibot.delete(number)
        jadibotMap.delete(number)
        console.log(`[JADIBOT] ${number} STOPPED BY MAIN BOT`)
        return
      }

      /* ===== LOGOUT PAKSA DARI WHATSAPP ===== */
      if (reason === DisconnectReason.loggedOut) {
        jadibotMap.delete(number)

        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true })
        }

        console.log(
          `[JADIBOT] ${number} LOGOUT PAKSA → session dihapus (perlu pairing ulang)`
        )
        return
      }

      /* ===== SESSION SUDAH TIDAK ADA ===== */
      if (!isSessionValid(sessionDir)) {
        jadibotMap.delete(number)
        console.log(`[JADIBOT] ${number} session tidak ada, tidak restart`)
        return
      }

      /* ===== RECONNECT NORMAL ===== */
      console.log(`[JADIBOT] ${number} reconnecting...`)
      setTimeout(() => {
        startJadibot(number, sendReply, mainBotNumber)
      }, 3000)
    }
  })

  /* ================= MESSAGE ================= */
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
  if (type !== 'notify') return

  for (const msg of messages) {
        if (!msg.message) continue

      try {
        await messageHandler(
          { message: msg, type: 'notify' },
          sock
        )
      } catch (err) {
          console.error('[JADIBOT MESSAGE ERROR]', err)
      }
    }
  })
}

/* ================= STOP JADIBOT ================= */
async function stopJadibot(number, sendReply) {
  number = number.replace(/[^0-9]/g, '')
  const sock = jadibotMap.get(number)

  if (!sock) {
    return sendReply(`❌ Jadibot ${number} tidak aktif`)
  }

  const sessionDir = path.join(process.cwd(), 'jadibot', number)

  // tandai stop manual
  stoppingJadibot.add(number)

  try {
    // 1️⃣ MATIKAN SEMUA EVENT
    sock.ev.removeAllListeners()

    // 2️⃣ TUTUP WS
    if (sock.ws) sock.ws.close()
  } catch {}

  // 3️⃣ HAPUS DARI MAP
  jadibotMap.delete(number)

  // 🔥 FIX PENTING: BERSIHKAN FLAG STOP
  stoppingJadibot.delete(number)

  // 4️⃣ HAPUS SESSION SETELAH SOCKET MATI
  setTimeout(() => {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true })
    }
  }, 500)

  sendReply(`✅ Jadibot ${number} dihentikan & sesi dihapus`)
}
/* ================= EXPORT ================= */
export {
  startJadibot,
  stopJadibot,
  jadibotMap
}