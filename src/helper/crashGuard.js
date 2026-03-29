const RESTART_DELAY_MS = 5000;
const MAX_ERRORS_PER_MINUTE = 20;
const CMD_TIMEOUT_MS = 120000;

let errorCount = 0;
let errorWindowStart = Date.now();

function trackError() {
    const now = Date.now();
    if (now - errorWindowStart > 60000) {
        errorCount = 0;
        errorWindowStart = now;
    }
    errorCount++;
    return errorCount;
}

export function setupCrashGuard(restartFn) {
    process.on('uncaughtException', (err, origin) => {
        const count = trackError();
        console.error(`\x1b[31m[CrashGuard] UncaughtException (${count} this minute):\x1b[39m`, err?.message || err);

        if (count >= MAX_ERRORS_PER_MINUTE) {
            console.error('\x1b[31m[CrashGuard] Too many errors, forcing restart...\x1b[39m');
            setTimeout(() => process.exit(1), 1000);
            return;
        }

        if (!process.env.BOT_DEV_MODE) return;
    });

    process.on('unhandledRejection', (reason, promise) => {
        const count = trackError();
        const msg = reason instanceof Error ? reason.message : String(reason);
        console.error(`\x1b[31m[CrashGuard] UnhandledRejection (${count} this minute):\x1b[39m`, msg);

        if (count >= MAX_ERRORS_PER_MINUTE) {
            console.error('\x1b[31m[CrashGuard] Too many rejections, forcing restart...\x1b[39m');
            setTimeout(() => process.exit(1), 1000);
        }
    });

    process.on('SIGTERM', () => {
        console.log('\x1b[33m[CrashGuard] SIGTERM received, shutting down gracefully...\x1b[39m');
        setTimeout(() => process.exit(0), 3000);
    });

    process.on('SIGINT', () => {
        console.log('\x1b[33m[CrashGuard] SIGINT received, shutting down gracefully...\x1b[39m');
        setTimeout(() => process.exit(0), 1000);
    });

    console.log('\x1b[32m[CrashGuard] Global crash protection active\x1b[39m');
}

export async function withTimeout(promise, ms = CMD_TIMEOUT_MS, label = 'operation') {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`[CrashGuard] "${label}" timed out after ${ms / 1000}s`));
        }, ms);
    });

    try {
        const result = await Promise.race([promise, timeout]);
        return result;
    } finally {
        clearTimeout(timer);
    }
}

export async function safeRun(fn, fallback = null, label = 'task') {
    try {
        return await fn();
    } catch (err) {
        console.error(`\x1b[31m[CrashGuard] Error in "${label}":\x1b[39m`, err?.message || err);
        return fallback;
    }
}
