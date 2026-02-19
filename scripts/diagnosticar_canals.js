#!/usr/bin/env node
/**
 * diagnosticar_canals.js
 * Compara el Google Sheets amb feed.json i detecta per a cada canal
 * qualsevol problema que pugui impedir o degradar la seva indexació.
 *
 * Ús: node scripts/diagnosticar_canals.js
 * No consumeix quota de YouTube API.
 */

'use strict';

const fs   = require('fs');
const https = require('https');
const path  = require('path');

// ── Configuració ────────────────────────────────────────────────────────────
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlB5oWUFyPtQu6U21l2sWRlnWPndhsVA-YvcB_3c9Eby80XKVgmnPdWNpwzcxSqMutkqV6RyJLjsMe/pub?gid=0&single=true&output=csv';
const PATH_FEED_JSON = path.join(__dirname, '../data/feed.json');
const OLD_CONTENT_DAYS = 60;   // Dies sense vídeo nou → avís
const FEW_VIDEOS_THRESHOLD = 5; // Vídeos totals (inclosos shorts) per sota → avís

// ── Colors ANSI ──────────────────────────────────────────────────────────────
const C = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    red:    '\x1b[31m',
    yellow: '\x1b[33m',
    green:  '\x1b[32m',
    blue:   '\x1b[34m',
    cyan:   '\x1b[36m',
    grey:   '\x1b[90m',
};
const ok  = (s) => `${C.green}${s}${C.reset}`;
const err = (s) => `${C.red}${s}${C.reset}`;
const warn = (s) => `${C.yellow}${s}${C.reset}`;
const info = (s) => `${C.cyan}${s}${C.reset}`;
const dim  = (s) => `${C.dim}${s}${C.reset}`;
const bold = (s) => `${C.bold}${s}${C.reset}`;

// ── Fetch amb seguiment de redireccions ─────────────────────────────────────
function fetchData(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        };
        https.get(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchData(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode}`));
                }
                resolve(data);
            });
        }).on('error', reject);
    });
}

// ── Parser CSV (igual que update_feed.js) ───────────────────────────────────
function parseCSV(csvText) {
    const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];

    const separator = lines[0].includes(';') &&
        lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';

    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    const normH = headers.map(h => h.normalize('NFD').replace(/\p{Diacritic}/gu, ''));

    const idIdx   = headers.indexOf('id');
    const nameIdx = headers.indexOf('name');
    const catIdx  = headers.indexOf('category');
    const accIdx  = normH.indexOf('acumular historic?');
    const accFbIdx= normH.indexOf('accumulate history?');
    const langIdx = normH.indexOf('filtre idioma');

    if (idIdx === -1) {
        console.error(err('❌ No s\'ha trobat la columna "id" al CSV'));
        return [];
    }

    return lines.slice(1).map(line => {
        const v = line.split(separator);
        const accVal  = v[accIdx >= 0 ? accIdx : accFbIdx]?.trim().toLowerCase() ?? '';
        const langVal = v[langIdx]?.trim().toLowerCase() ?? '';
        const rawCat  = v[catIdx] ? v[catIdx].trim() : '';
        const categories = rawCat.split(/[;,]/).map(c => c.trim()).filter(Boolean);
        return {
            id:               v[idIdx]?.trim() ?? '',
            name:             v[nameIdx]?.trim() ?? '',
            categories,
            shouldAccumulate: accVal === 'si',
            languageFilter:   langVal === 'auto' ? 'auto' : '',
        };
    }).filter(c => c.id);
}

// ── isCatalan (còpia exacta de update_feed.js) ───────────────────────────────
function countMarkers(text, markerSet) {
    return text.split(/\s+/)
        .filter(Boolean)
        .reduce((n, w) => n + (markerSet.has(w) ? 1 : 0), 0);
}
function isCatalan(video) {
    const audio    = (video.defaultAudioLanguage || '').toLowerCase();
    const metaLang = (video.defaultLanguage      || '').toLowerCase();

    if (audio.startsWith('es') || audio.startsWith('en') || audio.startsWith('fr')) return false;
    if (audio.startsWith('ca')) return true;
    if (metaLang.startsWith('ca')) return true;

    const text = `${video.title || ''} ${video.description || ''}`.toLowerCase();
    const mCa = new Set([' amb ', ' els ', ' les ', ' i ', ' per ', ' una ', ' això ', ' mateix ']);
    const mEs = new Set([' con ', ' los ', ' las ', ' y ', ' por ', ' una ', ' eso ', ' mismo ']);
    const sCa = [' amb ',' els ',' les ',' i ',' per ',' una ',' això ',' mateix '].filter(m => text.includes(m)).length;
    const sEs = [' con ',' los ',' las ',' y ',' por ',' una ',' eso ',' mismo '].filter(m => text.includes(m)).length;

    if (sEs > sCa && sEs > 1) return false;
    return true;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(dateStr) {
    if (!dateStr) return Infinity;
    const ms = Date.now() - new Date(dateStr).getTime();
    return ms / (1000 * 60 * 60 * 24);
}
function fmtDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ca-ES', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// ── Programa principal ───────────────────────────────────────────────────────
async function main() {
    console.log(`\n${bold('═══════════════════════════════════════════════════')}`);
    console.log(`${bold(' 🔍 Diagnòstic de canals — Segueix')}`);
    console.log(`${bold('═══════════════════════════════════════════════════')}\n`);

    // 1. Carrega feed.json
    if (!fs.existsSync(PATH_FEED_JSON)) {
        console.error(err('❌ feed.json no trobat: ' + PATH_FEED_JSON));
        process.exit(1);
    }
    const feed = JSON.parse(fs.readFileSync(PATH_FEED_JSON, 'utf8'));
    const feedChannelsMeta = feed.channels || {};    // { ucId: { name, categories, avatar, ... } }

    // Agrupa vídeos per sourceChannelId i per channelId
    const videosBySource   = new Map(); // sourceChannelId → videos[]
    const videosByChannelId= new Map(); // channelId → videos[]
    for (const v of (feed.videos || [])) {
        const src = v.sourceChannelId || v.channelId;
        if (src) {
            if (!videosBySource.has(src)) videosBySource.set(src, []);
            videosBySource.get(src).push(v);
        }
        if (v.channelId) {
            if (!videosByChannelId.has(v.channelId)) videosByChannelId.set(v.channelId, []);
            videosByChannelId.get(v.channelId).push(v);
        }
    }

    // 2. Carrega CSV del Google Sheets
    console.log(dim('  Descarregant Google Sheets...'));
    let sheetChannels;
    try {
        const csv = await fetchData(SHEET_CSV_URL);
        sheetChannels = parseCSV(csv);
        console.log(dim(`  Fulls de càlcul: ${sheetChannels.length} canals trobats.\n`));
    } catch (e) {
        console.error(err('❌ Error llegint Google Sheets: ' + e.message));
        process.exit(1);
    }

    // 3. Construeix set d'IDs del full per detectar orfes
    const sheetIdSet = new Set(sheetChannels.map(c => c.id.toLowerCase()));

    // 4. Diagnòstic per canal
    const allIssues = [];
    let countOk = 0;

    for (const ch of sheetChannels) {
        const issues  = []; // { level: 'error'|'warn'|'info', msg }
        const chIdLow = ch.id.toLowerCase();

        // Troba vídeos al feed (pot ser que sourceChannelId sigui la UC o el handle)
        const videos = videosBySource.get(ch.id)
                    || videosBySource.get(ch.id.toLowerCase())
                    || videosByChannelId.get(ch.id)
                    || [];

        const totalVideos = videos.length;
        const shorts      = videos.filter(v => v.isShort);
        const nonShorts   = videos.filter(v => !v.isShort);
        const newestDate  = videos.reduce((best, v) =>
            !best || new Date(v.publishedAt) > new Date(best) ? v.publishedAt : best, null);
        const age = daysAgo(newestDate);

        // Meta al feed.json
        const feedMeta = feedChannelsMeta[ch.id] || null;

        // ── Comprovacions ──────────────────────────────────────────────────

        // E1: Canal completament absent del feed
        if (totalVideos === 0 && !feedMeta) {
            if (ch.languageFilter === 'auto') {
                issues.push({ level: 'error',
                    msg: 'Cap vídeo al feed — el filtre "auto" probablement rebutja tots els vídeos per idioma' });
            } else {
                issues.push({ level: 'error',
                    msg: 'Cap vídeo al feed — el canal no ha estat mai indexat (torna a llançar "Actualitzador feed")' });
            }
        }

        // E2: Té meta però 0 vídeos (cas estrany)
        if (totalVideos === 0 && feedMeta) {
            issues.push({ level: 'error',
                msg: 'Apareix a la secció de canals del feed però sense cap vídeo associat' });
        }

        // W1: Filtre auto actiu
        if (ch.languageFilter === 'auto' && totalVideos > 0) {
            // Simula quants dels vídeos actuals passarien/fallarien
            const wouldFail = videos.filter(v => !isCatalan(v));
            if (wouldFail.length > 0) {
                const pct = Math.round((wouldFail.length / totalVideos) * 100);
                issues.push({ level: 'warn',
                    msg: `Filtre "auto" actiu — ${wouldFail.length}/${totalVideos} vídeos (${pct}%) serien rebutjats per idioma` });
                // Mostra els motius dels primers 3
                wouldFail.slice(0, 3).forEach(v => {
                    const lang = v.defaultAudioLanguage || v.defaultLanguage || '?';
                    issues.push({ level: 'info',
                        msg: `  ↳ "${v.title.slice(0, 60)}" [lang=${lang}]`, indent: true });
                });
            }
        }

        // W2: Canal sense filtre auto però amb vídeos que fallarien si s'activés
        if (ch.languageFilter !== 'auto' && totalVideos > 0) {
            const wouldFail = videos.filter(v => !isCatalan(v));
            if (wouldFail.length > 0) {
                const pct = Math.round((wouldFail.length / totalVideos) * 100);
                issues.push({ level: 'warn',
                    msg: `Sense filtre "auto" — però ${wouldFail.length}/${totalVideos} vídeos (${pct}%) fallarien si s'activés` });
            }
        }

        // W3: Tots els vídeos son Shorts
        if (totalVideos > 0 && nonShorts.length === 0) {
            issues.push({ level: 'warn',
                msg: `Tots els ${totalVideos} vídeos son Shorts (≤120s) — no apareixeran a les graelles principals` });
        }
        // W4: Majoria Shorts
        else if (totalVideos > 0 && shorts.length / totalVideos > 0.7) {
            const pct = Math.round((shorts.length / totalVideos) * 100);
            issues.push({ level: 'warn',
                msg: `${pct}% dels vídeos son Shorts (${shorts.length}/${totalVideos})` });
        }

        // W5: Molt poc contingut
        if (totalVideos > 0 && totalVideos < FEW_VIDEOS_THRESHOLD) {
            issues.push({ level: 'warn',
                msg: `Només ${totalVideos} vídeo${totalVideos !== 1 ? 's' : ''} al feed (llindar: ${FEW_VIDEOS_THRESHOLD})` });
        }

        // W6: Contingut molt antic
        if (totalVideos > 0 && age > OLD_CONTENT_DAYS) {
            issues.push({ level: 'warn',
                msg: `Darrer vídeo fa ${Math.round(age)} dies (${fmtDate(newestDate)})` });
        }

        // W7: Categories inconsistents entre Sheets i feed.json
        if (feedMeta && Array.isArray(feedMeta.categories) && feedMeta.categories.length > 0) {
            const feedCats  = [...feedMeta.categories].map(c => c.toLowerCase()).sort();
            const sheetCats = [...ch.categories].map(c => c.toLowerCase()).sort();
            if (JSON.stringify(feedCats) !== JSON.stringify(sheetCats)) {
                issues.push({ level: 'warn',
                    msg: `Categories inconsistents — Sheets: [${sheetCats.join(', ')}] | feed.json: [${feedCats.join(', ')}]` });
            }
        }

        // I1: Sense avatar
        if (feedMeta && !feedMeta.avatar) {
            issues.push({ level: 'info',
                msg: 'Sense avatar al feed.json (pot ser canal sense imatge a la API)' });
        }

        // ── Imprimeix resultat ─────────────────────────────────────────────
        const hasError = issues.some(i => i.level === 'error');
        const hasWarn  = issues.some(i => i.level === 'warn');
        const icon = hasError ? '❌' : hasWarn ? '⚠️ ' : '✅';
        const nameStr = `${bold(ch.name || ch.id)} ${dim(`[${ch.id}]`)}`;
        const statsStr = totalVideos > 0
            ? dim(` ${nonShorts.length} vídeos + ${shorts.length} shorts`)
            : '';

        console.log(`${icon} ${nameStr}${statsStr}`);

        if (issues.length > 0) {
            for (const issue of issues) {
                if (issue.indent) {
                    process.stdout.write(`      ${dim(issue.msg)}\n`);
                    continue;
                }
                const prefix = issue.level === 'error' ? err('    ✖ ')
                             : issue.level === 'warn'  ? warn('    ▲ ')
                             :                           info('    ℹ ');
                const color  = issue.level === 'error' ? err
                             : issue.level === 'warn'  ? warn
                             :                           info;
                console.log(`${prefix}${color(issue.msg)}`);
            }
            allIssues.push({ channel: ch.name || ch.id, id: ch.id, issues });
        } else {
            countOk++;
        }
    }

    // 5. Canals "orfes" (al feed però no al full de càlcul)
    const orphans = Object.keys(feedChannelsMeta).filter(ucId => !sheetIdSet.has(ucId.toLowerCase()));
    if (orphans.length > 0) {
        console.log(`\n${bold('─── Canals orfes (al feed però no al Google Sheets) ───')}`);
        for (const ucId of orphans) {
            const meta = feedChannelsMeta[ucId];
            const vids = (videosByChannelId.get(ucId) || []).length;
            console.log(`  ${warn('⚠️')}  ${bold(meta.name || ucId)} ${dim(`[${ucId}]`)} — ${vids} vídeos al feed`);
        }
    }

    // 6. Resum
    const totalChannels = sheetChannels.length;
    const errCount  = allIssues.filter(x => x.issues.some(i => i.level === 'error')).length;
    const warnCount = allIssues.filter(x => x.issues.some(i => i.level === 'warn') && !x.issues.some(i => i.level === 'error')).length;

    console.log(`\n${bold('═══════════════════════════════════════════════════')}`);
    console.log(`${bold(' Resum')}`);
    console.log(bold('═══════════════════════════════════════════════════'));
    console.log(`  Total canals al full:  ${bold(totalChannels)}`);
    console.log(`  ${ok(`✅ Sense incidències:   ${countOk}`)}`);
    console.log(`  ${warn(`⚠️  Advertències:        ${warnCount}`)}`);
    console.log(`  ${err(`❌ Errors crítics:      ${errCount}`)}`);
    if (orphans.length > 0) {
        console.log(`  ${warn(`👻 Canals orfes:        ${orphans.length}`)}`);
    }
    console.log(bold('═══════════════════════════════════════════════════\n'));
}

main().catch(e => {
    console.error(err('❌ Error fatal: ' + e.message));
    process.exit(1);
});
