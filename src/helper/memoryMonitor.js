/**
 * ═══════════════════════════════════════════════════════════════
 *  Base Script    : Bang Dika Ardnt
 *  Recode By      : Bang Wilykun
 *  WhatsApp       : 6289688206739
 *  Telegram       : @Wilykun1994
 * ═══════════════════════════════════════════════════════════════
 *  Script ini GRATIS, tidak untuk diperjualbelikan!
 *  Jika ketahuan menjual script ini = NO UPDATE / NO FIX
 *  Hargai kerja keras developer, gunakan dengan bijak!
 * ═══════════════════════════════════════════════════════════════
 */

import os from 'os';
import fs from 'fs';
import path from 'path';

function loadConfig() {
        try {
                const configPath = path.join(process.cwd(), 'config.json');
                if (fs.existsSync(configPath)) {
                        const data = fs.readFileSync(configPath, 'utf-8');
                        return JSON.parse(data);
                }
        } catch (err) {
                console.warn('\x1b[33mWarning: Failed to load config.json, using defaults.\x1b[39m');
        }
        return null;
}

function saveConfig(config) {
        try {
                const configPath = path.join(process.cwd(), 'config.json');
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
                return true;
        } catch (err) {
                console.warn('\x1b[33mWarning: Failed to save config.json.\x1b[39m');
                return false;
        }
}

function formatBytes(bytes) {
        if (bytes >= 1024 * 1024 * 1024) {
                return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        } else if (bytes >= 1024 * 1024) {
                return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        } else if (bytes >= 1024) {
                return (bytes / 1024).toFixed(2) + ' KB';
        }
        return bytes + ' Bytes';
}

function getCurrentMemoryUsage() {
        const memUsage = process.memoryUsage();
        return {
                rss: memUsage.rss,
                heapTotal: memUsage.heapTotal,
                heapUsed: memUsage.heapUsed,
                external: memUsage.external,
                arrayBuffers: memUsage.arrayBuffers || 0
        };
}

function getSystemMemoryInfo() {
        return {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
        };
}

export class MemoryMonitor {
        constructor(options = {}) {
                const config = loadConfig();
                const memConfig = config?.memoryMonitor || {};

                this.enabled = memConfig.enabled !== false;
                this.checkInterval = memConfig.checkIntervalMs || 30000;
                this.logUsage = memConfig.logUsage !== false;
                this.autoDetect = memConfig.autoDetectLimit !== false;
                this.autoDetectPercentage = memConfig.autoDetectPercentage || 80;

                if (this.autoDetect) {
                        const systemTotal = os.totalmem();
                        this.memoryLimit = Math.floor(systemTotal * (this.autoDetectPercentage / 100));
                } else {
                        this.memoryLimit = (memConfig.limitMB || 500) * 1024 * 1024;
                }

                this.onLimitReached = options.onLimitReached || (() => process.exit(1));
                this.intervalId = null;
                this.isShuttingDown = false;
                this.config = config;
        }

        start() {
                if (!this.enabled) {
                        console.log('\x1b[33m[Memory Monitor] Disabled in config.json\x1b[39m');
                        return;
                }

                const systemMem = getSystemMemoryInfo();
                const limitLabel = this.autoDetect ? `Auto ${this.autoDetectPercentage}%` : 'Manual';
                console.log(
                        `\x1b[32m[MemoryMonitor] Active\x1b[0m` +
                        ` | Sys: \x1b[36m${formatBytes(systemMem.total)}\x1b[0m` +
                        ` | Limit: \x1b[33m${formatBytes(this.memoryLimit)} (${limitLabel})\x1b[0m` +
                        ` | Interval: \x1b[33m${this.checkInterval / 1000}s\x1b[0m`
                );

                this.checkMemory();

                this.intervalId = setInterval(() => {
                        this.checkMemory();
                }, this.checkInterval);
        }

        stop() {
                if (this.intervalId) {
                        clearInterval(this.intervalId);
                        this.intervalId = null;
                }
        }

        checkMemory() {
                if (this.isShuttingDown) return;

                const memUsage = getCurrentMemoryUsage();
                const systemMem = getSystemMemoryInfo();
                const currentUsage = memUsage.rss;
                const percentage = ((currentUsage / this.memoryLimit) * 100).toFixed(1);
                const sysPercentage = ((systemMem.used / systemMem.total) * 100).toFixed(1);

                if (this.logUsage) {
                        const pct = parseFloat(percentage);
                        let color = '\x1b[32m';
                        let icon = '✅';
                        if (pct >= 80) { color = '\x1b[31m'; icon = '🔴'; }
                        else if (pct >= 60) { color = '\x1b[33m'; icon = '⚠️ '; }

                        const barLen = 20;
                        const filled = Math.round((pct / 100) * barLen);
                        const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

                        console.log(
                                `\x1b[36m[MemoryMonitor]\x1b[0m ${icon} Bot: ${color}${formatBytes(currentUsage)} / ${formatBytes(this.memoryLimit)}\x1b[0m` +
                                ` [${color}${bar}\x1b[0m] ${color}${percentage}%\x1b[0m` +
                                ` | Sys: ${formatBytes(systemMem.used)}/${formatBytes(systemMem.total)} (${sysPercentage}%)`
                        );
                }

                if (currentUsage >= this.memoryLimit) {
                        this.isShuttingDown = true;
                        this.stop();

                        const red = '\x1b[31m';
                        const yellow = '\x1b[33m';
                        const cyan = '\x1b[36m';
                        const reset = '\x1b[0m';

                        console.log('');
                        console.log(`${red}════════════════════════════════════════${reset}`);
                        console.log(`${red}   MEMORY LIMIT REACHED - AUTO RESTART${reset}`);
                        console.log(`${red}════════════════════════════════════════${reset}`);
                        console.log(`${yellow}Current Usage: ${formatBytes(currentUsage)}${reset}`);
                        console.log(`${yellow}Limit: ${formatBytes(this.memoryLimit)}${reset}`);
                        console.log(`${cyan}Restarting bot in 2 seconds...${reset}`);
                        console.log(`${red}════════════════════════════════════════${reset}`);
                        console.log('');

                        setTimeout(() => {
                                this.onLimitReached();
                        }, 2000);
                }
        }

        getStatus() {
                const memUsage = getCurrentMemoryUsage();
                const systemMem = getSystemMemoryInfo();

                return {
                        enabled: this.enabled,
                        autoDetect: this.autoDetect,
                        autoDetectPercentage: this.autoDetectPercentage,
                        limit: this.memoryLimit,
                        limitFormatted: formatBytes(this.memoryLimit),
                        current: memUsage.rss,
                        currentFormatted: formatBytes(memUsage.rss),
                        percentage: ((memUsage.rss / this.memoryLimit) * 100).toFixed(1),
                        checkInterval: this.checkInterval,
                        logUsage: this.logUsage,
                        heap: {
                                total: memUsage.heapTotal,
                                used: memUsage.heapUsed,
                                totalFormatted: formatBytes(memUsage.heapTotal),
                                usedFormatted: formatBytes(memUsage.heapUsed)
                        },
                        system: {
                                total: systemMem.total,
                                free: systemMem.free,
                                used: systemMem.used,
                                totalFormatted: formatBytes(systemMem.total),
                                freeFormatted: formatBytes(systemMem.free),
                                usedFormatted: formatBytes(systemMem.used)
                        }
                };
        }
}

export { loadConfig, saveConfig, formatBytes, getCurrentMemoryUsage, getSystemMemoryInfo };
