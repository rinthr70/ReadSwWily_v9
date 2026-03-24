# Wily Bot - WhatsApp Self-Bot

## Overview

This is a WhatsApp self-bot built using the Baileys library. It operates as a personal automation tool for WhatsApp, allowing the owner to automate various tasks like auto-reading stories, anti-delete message features, auto-typing indicators, and more. The bot connects to WhatsApp via QR code or pairing code and runs as a linked device.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Framework
- **Runtime**: Node.js with ES Modules (type: "module")
- **WhatsApp Connection**: Baileys v7.0.0-rc.6 - An unofficial WhatsApp Web API library that connects via WebSocket
- **Authentication**: Multi-file auth state stored in `sessions/` directory as JSON files

### Bot Features Architecture
Configuration-driven features defined in `config.json`:
- **Auto Online**: Keeps the bot appearing online at regular intervals
- **Memory Monitor**: Monitors and limits memory usage with auto-detection
- **Auto Read Story**: Automatically reads WhatsApp statuses with optional reactions
- **Auto Typing/Recording**: Simulates typing or recording indicators
- **Anti-Delete**: Captures deleted messages and forwards them to bot's own number. Supports text, images, videos, audio, stickers, and documents. Can be toggled on/off with `.antidel on/off` command. Separate settings for private chat and group chat.

### Download Features
- **TikTok Downloader** (`.tt`, `.tiktok`, `.ttdl`): Downloads video and audio from TikTok. Supports multiple API versions (v1, v2, v3). Also supports TikTok slide/photo posts.
- **Instagram Downloader** (`.ig`, `.igdl`): Downloads reels and posts from Instagram.
- **Facebook Downloader** (`.fb`, `.fbdl`): Downloads videos from Facebook.

### Data Storage
- **JSON-based database**: Custom `JSONDB` class for lightweight data persistence
- **Session storage**: Authentication credentials and device lists stored as JSON files in `sessions/{session_name}/`
- **Contacts/Groups cache**: Stored locally for quick access without API calls
- **Bot statistics**: Tracked in `data/bot_stats.json` including uptime and restart counts

### Command System
- Commands loaded dynamically from command files
- Each command exports: `command` (array of aliases), `description`, `example`, and `execute` function
- Owner-only commands check `isOwner` flag before execution

### Helper Modules
- `inject.js`: Extends the Baileys socket with additional functionality
- `utils.js`: Configuration loading and utility functions
- `memoryMonitor.js`: Memory usage tracking and limits
- `phoneRegion.js`: Phone number formatting with country detection
- `cleaner.js`: Temporary file management and cleanup

## External Dependencies

### WhatsApp API
- **Baileys**: Unofficial WhatsApp Web API (connects via WebSocket to WhatsApp servers)
- Requires phone pairing or QR code scan for authentication
- Session persists across restarts via stored credentials

### Telegram Integration
- Bot notifications sent to Telegram via Bot API
- Configured with token and chat ID in `config.json`
- Used for remote monitoring and alerts

### NPM Packages
- **@hapi/boom**: HTTP-friendly error objects
- **pino**: Fast JSON logger
- **qrcode-terminal**: QR code display in terminal for WhatsApp pairing
- **dotenv**: Environment variable management
- **@tobyg74/tiktok-api-dl**: TikTok video/audio downloader API (v1, v2, v3 support)

### Environment Variables
- `BOT_SESSION_NAME`: Session folder name (default: "default")
- `BOT_NUMBER_OWNER`: Owner phone number for permission checks
- `BOT_MAX_RETRIES`: Maximum reconnection attempts