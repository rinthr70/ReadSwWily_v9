<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=28&pause=1000&color=25D366&center=true&vCenter=true&width=600&lines=🤖+WILY+BOT;WhatsApp+Multi-Fitur+Bot;Powered+by+Baileys+%2B+Node.js" alt="Typing SVG" />

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Baileys-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![License](https://img.shields.io/badge/License-FREE-blue?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)]()

<br/>

> **WhatsApp Bot multi-fitur berbasis [Baileys](https://github.com/WhiskeySockets/Baileys)**
> Script ini **FREE** — tidak untuk diperjualbelikan!

</div>

---

## 📋 Daftar Isi

- [✨ Fitur Unggulan](#-fitur-unggulan)
- [📦 Instalasi](#-instalasi)
- [⚙️ Konfigurasi](#️-konfigurasi)
- [📖 Daftar Command](#-daftar-command)
- [🎬 YouTube Downloader](#-youtube-downloader)
- [🤖 Jadibot (Multi-Session)](#-jadibot-multi-session)
- [🛡️ Fitur Keamanan](#️-fitur-keamanan)
- [📝 Kredit](#-kredit)

---

## ✨ Fitur Unggulan

<table>
  <tr>
    <td align="center">🎵</td>
    <td><b>YouTube Downloader</b><br/>Download audio MP3 & video MP4 dari YouTube dengan thumbnail real-time</td>
  </tr>
  <tr>
    <td align="center">🤖</td>
    <td><b>Jadibot (Multi-Session)</b><br/>Clone bot ke nomor WhatsApp lain via pairing code</td>
  </tr>
  <tr>
    <td align="center">🧠</td>
    <td><b>Auto Simi (AI Chat)</b><br/>Balas pesan otomatis menggunakan AI Groq/Llama-3.1</td>
  </tr>
  <tr>
    <td align="center">👁️</td>
    <td><b>Auto Read Story</b><br/>Otomatis lihat & react story WhatsApp kontak</td>
  </tr>
  <tr>
    <td align="center">🛡️</td>
    <td><b>Anti-Delete</b><br/>Simpan & kirim ulang pesan yang dihapus</td>
  </tr>
  <tr>
    <td align="center">📵</td>
    <td><b>Anti-Call</b><br/>Tolak panggilan suara/video otomatis dengan pesan custom</td>
  </tr>
  <tr>
    <td align="center">📥</td>
    <td><b>Multi Downloader</b><br/>TikTok, Instagram, Facebook, YouTube dalam satu bot</td>
  </tr>
  <tr>
    <td align="center">🖼️</td>
    <td><b>Sticker Tools</b><br/>Buat sticker dari gambar, konversi sticker ke gambar</td>
  </tr>
  <tr>
    <td align="center">📲</td>
    <td><b>View-Once Bypass</b><br/>Ambil & simpan media view-once sebelum menghilang</td>
  </tr>
  <tr>
    <td align="center">📡</td>
    <td><b>Telegram Integration</b><br/>Forward story/log WhatsApp ke Telegram bot</td>
  </tr>
</table>

---

## 📦 Instalasi

<details>
<summary><b>🔽 Klik untuk melihat langkah instalasi lengkap</b></summary>

<br/>

### Persyaratan
- **Node.js** v18 atau lebih baru
- **npm** v8+
- **ffmpeg** (untuk YouTube audio/video)
- **yt-dlp** (sudah disertakan di folder `tmp/`)

### Langkah-langkah

```bash
# 1. Clone repositori
git clone https://github.com/username/wily-bot.git
cd wily-bot

# 2. Install dependensi
npm install

# 3. Pastikan yt-dlp bisa dieksekusi
chmod +x tmp/yt-dlp

# 4. Edit konfigurasi (lihat bagian Konfigurasi)
nano config.json

# 5. Jalankan bot
node index.js
```

### Pairing Bot
Saat pertama kali dijalankan, bot akan meminta nomor WhatsApp untuk mendapatkan **Pairing Code**. Masukkan kode tersebut di WhatsApp:

> **Perangkat Tertaut → Tautkan Perangkat → Tautkan dengan Nomor Telepon**

</details>

---

## ⚙️ Konfigurasi

<details>
<summary><b>🔽 Klik untuk melihat panduan konfigurasi config.json</b></summary>

<br/>

Edit file `config.json` sesuai kebutuhan:

```json
{
  "owners": ["6281234567890"],

  "autoOnline": {
    "enabled": true,
    "intervalSeconds": 15
  },

  "autoReadStory": {
    "enabled": true,
    "autoReaction": true,
    "randomDelay": true,
    "delayMinMs": 1000,
    "delayMaxMs": 20000
  },

  "antiDelete": {
    "enabled": false,
    "privateChat": true,
    "groupChat": true
  },

  "antiCall": {
    "enabled": false,
    "message": "Maaf, tidak bisa menerima panggilan.",
    "whitelist": []
  },

  "telegram": {
    "enabled": false,
    "token": "BOT_TOKEN_TELEGRAM",
    "chatId": "CHAT_ID_TELEGRAM"
  },

  "autoSimi": {
    "enabled": false,
    "apiKey": "API_KEY_GROQ"
  },

  "sticker": {
    "pack": "Nama Pack",
    "author": "Nama Author"
  }
}
```

| Key | Deskripsi |
|---|---|
| `owners` | Nomor WhatsApp owner (format: 628xxx tanpa +) |
| `autoOnline` | Jaga status online secara berkala |
| `autoReadStory` | Auto lihat & react story |
| `antiDelete` | Simpan pesan yang dihapus |
| `antiCall` | Tolak panggilan otomatis |
| `telegram` | Forward ke Telegram bot |
| `autoSimi` | Balas otomatis dengan AI |

</details>

---

## 📖 Daftar Command

<details>
<summary><b>🔽 Utilitas & Info</b></summary>

<br/>

| Command | Deskripsi |
|---|---|
| `.menu` | Tampilkan semua daftar command |
| `.ping` / `.p` | Cek kecepatan respons bot |
| `.info` | Informasi detail bot |
| `.owner` | Tampilkan kontak owner |
| `.quoted` / `.q` | Ambil isi pesan yang di-quote |

</details>

<details>
<summary><b>🔽 Sticker & Media</b></summary>

<br/>

| Command | Deskripsi |
|---|---|
| `.s` / `.sticker` | Buat sticker dari gambar/video |
| `.toimg` | Konversi sticker ke gambar |
| `.vo` / `.rvo` | Ambil media View-Once |

</details>

<details>
<summary><b>🔽 Downloader</b></summary>

<br/>

| Command | Deskripsi |
|---|---|
| `.tt <link>` | Download video TikTok (tanpa watermark) |
| `.ig <link>` | Download foto/video Instagram |
| `.fb <link>` | Download video Facebook |
| `.play <judul>` | Cari & download audio YouTube (MP3) |
| `.ytmp3 <link>` | Download audio YouTube (MP3) via URL |
| `.ytmp4 <link>` | Download video YouTube (MP4, 360p) via URL |

</details>

<details>
<summary><b>🔽 Grup</b></summary>

<br/>

| Command | Deskripsi |
|---|---|
| `.hidetag` / `.ht` | Tag semua anggota grup secara tersembunyi |
| `.all` | Mention semua anggota grup |
| `.group open` | Buka grup (hanya admin) |
| `.group close` | Tutup grup (hanya admin) |

</details>

<details>
<summary><b>🔽 Auto & Fitur Aktif</b></summary>

<br/>

| Command | Deskripsi |
|---|---|
| `.simi on/off` | Aktifkan/nonaktifkan Auto Simi AI |
| `.anticall on/off` | Aktifkan/nonaktifkan tolak panggilan suara |
| `.anticallvid on/off` | Aktifkan/nonaktifkan tolak panggilan video |
| `.antidel on/off` | Aktifkan/nonaktifkan anti-delete |
| `.typing on/off` | Aktifkan/nonaktifkan auto typing |
| `.recording on/off` | Aktifkan/nonaktifkan auto recording |
| `.readsw on/off` | Aktifkan/nonaktifkan auto baca story |

</details>

<details>
<summary><b>🔽 Owner Only</b></summary>

<br/>

| Command | Deskripsi |
|---|---|
| `.eval <kode>` | Jalankan kode JavaScript |
| `.bash <perintah>` | Jalankan perintah terminal |
| `.addowner <nomor>` | Tambah owner baru |
| `.backup` | Backup file session/config |
| `.restart` | Restart bot |

</details>

---

## 🎬 YouTube Downloader

<details>
<summary><b>🔽 Cara penggunaan & contoh hasil</b></summary>

<br/>

Bot menggunakan **yt-dlp** (binary terbaru 2026) sebagai engine download, sehingga akurat dan stabil untuk semua video YouTube terbaru.

### `.play <judul lagu>`
Cari dan download audio dari YouTube berdasarkan kata kunci.

```
.play shape of you ed sheeran
.play faded alan walker
```

**Alur:**
1. 🔍 Bot cari video yang paling relevan
2. 📸 Thumbnail + info video langsung muncul
3. ⬇️ Audio MP3 dikirim ke chat
4. ✅ Selesai

---

### `.ytmp3 <url>`
Download audio MP3 dari link YouTube langsung.

```
.ytmp3 https://youtu.be/JGwWNGJdvx8
.ytmp3 https://www.youtube.com/watch?v=JGwWNGJdvx8
```

---

### `.ytmp4 <url>`
Download video MP4 (kualitas 360p) dari link YouTube.

```
.ytmp4 https://youtu.be/dQw4w9WgXcQ
.ytmp4 https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

---

**Info yang ditampilkan di setiap thumbnail:**

```
╭═══〔 🎵 YTMP3 DOWNLOADER 〕═══╮
│
│ 📌 Shape of You
│ ⏱️ Durasi  : 3:53
│ 👁️ Views   : 6.692.687.758
│ 👤 Channel : Ed Sheeran
│ 👍 Likes   : 35.415.358
│ 🔗 Link    : https://youtu.be/JGwWNGJdvx8
│
│ ⬇️ Sedang mengunduh audio MP3...
╰══════════════════════════════╯
```

**Batas durasi:**
- `.play` & `.ytmp3` → maksimal **10 menit**
- `.ytmp4` → maksimal **5 menit**

</details>

---

## 🤖 Jadibot (Multi-Session)

<details>
<summary><b>🔽 Cara menggunakan fitur Jadibot</b></summary>

<br/>

Fitur Jadibot memungkinkan siapa saja untuk "meminjam" bot ke nomor WhatsApp mereka sendiri menggunakan pairing code.

### Cara Pakai

```
.jadibot
```

Bot akan mengirim **Pairing Code** 8 digit. Masukkan kode tersebut di WhatsApp:
> **Perangkat Tertaut → Tautkan dengan Nomor Telepon → masukkan kode**

### Command Jadibot

| Command | Deskripsi |
|---|---|
| `.jadibot` | Mulai sesi jadibot untuk nomormu |
| `.stopjadibot` | Hentikan sesi jadibot |
| `.listjadibot` | Lihat daftar jadibot yang aktif |

> **Catatan:** Setiap session jadibot tersimpan di folder `jadibot/` dan tetap aktif meskipun bot di-restart.

</details>

---

## 🛡️ Fitur Keamanan

<details>
<summary><b>🔽 Detail fitur keamanan bot</b></summary>

<br/>

### Anti-Delete
Saat seseorang menghapus pesan, bot mendeteksinya dan mengirim ulang isi pesan ke chat yang sama.

```
.antidel on   → aktifkan
.antidel off  → nonaktifkan
```

### Anti-Call
Bot otomatis menolak panggilan masuk dan membalas dengan pesan custom.

```
.anticall on    → tolak panggilan suara
.anticallvid on → tolak panggilan video
```

### Crash Guard
Bot dilengkapi sistem perlindungan crash global yang mencegah bot mati akibat error tak terduga.

### Memory Monitor
Bot memantau penggunaan RAM secara berkala dan dapat auto-restart jika melebihi batas yang dikonfigurasi.

### Auto Cleaner
File temporary (hasil download) dibersihkan otomatis setiap 6 jam.

</details>

---

## 📝 Kredit

<div align="center">

| Peran | Nama |
|---|---|
| 🛠️ Pengembang Utama | **Bang Wily (Wilykun)** |
| 🙏 Base Script | **Bang Dika Ardnt** |
| 📚 Library | [Baileys (WhiskeySockets)](https://github.com/WhiskeySockets/Baileys) |
| 🎬 YouTube Engine | [yt-dlp](https://github.com/yt-dlp/yt-dlp) |

<br/>

> ⚠️ **Script ini GRATIS dan tidak untuk diperjualbelikan!**
> Jika kamu menemukannya dijual, itu adalah penipuan.

<br/>

[![WhatsApp](https://img.shields.io/badge/Hubungi_Owner-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/6289681008411)

<br/>

**Made with ❤️ by Bang Wily**

</div>
