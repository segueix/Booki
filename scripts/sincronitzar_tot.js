const fs = require('fs');
const https = require('https');
const path = require('path');

// --- CONFIGURACIÓ ---
const SHEET_CSV_URL = process.env.GOOGLE_SHEET_CSV_URL;

if (!SHEET_CSV_URL) {
    console.error('🚫 Error: Falta la URL de Google Sheets (GOOGLE_SHEET_CSV_URL).');
    process.exit(1);
}
const PATH_CHANNELS_JSON = path.join(__dirname, '../js/channels-ca.json');
const PATH_FEED_JSON = path.join(__dirname, '../data/feed.json');
const PATH_SW = path.join(__dirname, '../sw.js'); // Per forçar actualització de cache

// --- FUNCIONS ---
const fetchData = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchData(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
};

function parseCSV(csvText) {
    const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    let separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    const idIdx = headers.indexOf('id');
    const nameIdx = headers.indexOf('name');
    const catIdx = headers.indexOf('category');

    if (idIdx === -1) return [];

    return lines.slice(1).map(line => {
        const values = line.split(separator);
        const rawCats = values[catIdx] ? values[catIdx].trim() : '';
        const categories = rawCats.split(/[;,]/).map(c => c.trim()).filter(Boolean);
        return {
            id: values[idIdx]?.trim(),
            name: values[nameIdx]?.trim(),
            categories: categories,
            mainCategory: categories[0] || 'Altres'
        };
    }).filter(c => c.id);
}

// --- PROGRAMA PRINCIPAL ---
async function main() {
    try {
        console.log('📡 1. Descarregant dades del Google Sheets...');
        const csvData = await fetchData(SHEET_CSV_URL);
        const sheetChannels = parseCSV(csvData);
        console.log(`   ✅ Trobats ${sheetChannels.length} canals al full de càlcul.`);

        // 1. REGENERAR channels-ca.json (Font de la veritat)
        const channelsJsonOutput = {
            updatedAt: new Date().toISOString(),
            channels: sheetChannels.map(c => ({
                id: c.id,
                name: c.name,
                categories: c.categories,
                category: c.mainCategory 
            }))
        };
        fs.writeFileSync(PATH_CHANNELS_JSON, JSON.stringify(channelsJsonOutput, null, 2));
        console.log('📝 2. Fitxer js/channels-ca.json regenerat.');

        // 2. ACTUALITZAR feed.json (Correcció massiva)
        if (fs.existsSync(PATH_FEED_JSON)) {
            const feedData = JSON.parse(fs.readFileSync(PATH_FEED_JSON, 'utf8'));

            // Creem un mapa intel·ligent: ID/Handle -> Noves Categories
            const categoriesMap = {};
            sheetChannels.forEach(c => {
                categoriesMap[c.id.toLowerCase()] = c.categories;
            });

            // A. Mapa de traducció: UC_ID -> Categories (Utilitzant metadades del feed per connectar Handles)
            const ucToCategories = {};
            
            if (feedData.channels) {
                Object.keys(feedData.channels).forEach(ucId => {
                    const ch = feedData.channels[ucId];
                    const handle = ch.handle ? ch.handle.toLowerCase() : '';
                    const ucIdLower = ucId.toLowerCase();

                    // Intentem trobar les categories ja sigui per ID o per Handle
                    let newCats = categoriesMap[ucIdLower] || (handle ? categoriesMap[handle] : null);

                    if (newCats) {
                        // Actualitzem la info del canal al feed
                        feedData.channels[ucId].categories = newCats;
                        // Guardem la relació per usar-la als vídeos
                        ucToCategories[ucId] = newCats;
                    }
                });
            }

            // B. Escombrada de vídeos
            let videosUpdated = 0;
            if (Array.isArray(feedData.videos)) {
                feedData.videos.forEach(video => {
                    let newCats = null;

                    // Prioritat 1: Buscar per ID tècnic del canal (UC...)
                    if (video.channelId && ucToCategories[video.channelId]) {
                        newCats = ucToCategories[video.channelId];
                    }
                    // Prioritat 2: Buscar per ID font (per si és un Handle @...)
                    else if (video.sourceChannelId && categoriesMap[video.sourceChannelId.toLowerCase()]) {
                        newCats = categoriesMap[video.sourceChannelId.toLowerCase()];
                    }

                    if (newCats) {
                        // Si les categories són diferents, actualitzem
                        if (JSON.stringify(video.categories) !== JSON.stringify(newCats)) {
                            video.categories = newCats;
                            videosUpdated++;
                        }
                    }
                });
            }

            fs.writeFileSync(PATH_FEED_JSON, JSON.stringify(feedData, null, 2));
            console.log(`💾 3. feed.json actualitzat: ${videosUpdated} vídeos corregits.`);
        }

        // 3. FORÇAR ACTUALITZACIÓ DEL NAVEGADOR (CACHE BUSTING)
        if (fs.existsSync(PATH_SW)) {
            let swContent = fs.readFileSync(PATH_SW, 'utf8');
            // Busquem la línia "const CACHE_NAME = 'mytube-vXX';" i incrementem el número
            const newSwContent = swContent.replace(/const CACHE_NAME = 'mytube-v(\d+)';/, (match, num) => {
                const newVer = parseInt(num) + 1;
                console.log(`🚀 4. Actualitzant Service Worker: v${num} -> v${newVer}`);
                return `const CACHE_NAME = 'mytube-v${newVer}';`;
            });
            fs.writeFileSync(PATH_SW, newSwContent);
        }

        console.log('✨ Procés finalitzat amb èxit!');

    } catch (error) {
        console.error('❌ Error fatal:', error);
    }
}

main();
