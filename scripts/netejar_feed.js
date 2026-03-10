const fs = require('fs');
const path = require('path');

const FEED_PATH = path.join(__dirname, '../data/feed.json');
const CHANNELS_PATH = path.join(__dirname, '../js/channels-ca.json');
const API_KEY = process.env.YOUTUBE_API_KEY;

function loadJson(filePath, fallback = null) {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        throw new Error(`No s'ha pogut llegir ${path.basename(filePath)}: ${error.message}`);
    }
}

function getActiveChannelIds(channelsData) {
    const channels = Array.isArray(channelsData?.channels) ? channelsData.channels : [];
    return new Set(
        channels
            .map((channel) => String(channel?.id || '').trim())
            .filter(Boolean)
    );
}

function removeInactiveChannelMetadata(feedChannels, activeChannelIds) {
    if (!feedChannels || typeof feedChannels !== 'object') {
        return { cleanedChannels: {}, removedCount: 0 };
    }

    const cleanedChannels = {};
    let removedCount = 0;

    for (const [channelId, meta] of Object.entries(feedChannels)) {
        if (activeChannelIds.has(channelId)) {
            cleanedChannels[channelId] = meta;
        } else {
            removedCount += 1;
        }
    }

    return { cleanedChannels, removedCount };
}

async function cleanFeed() {
    if (!API_KEY) {
        console.error('🚫 Error: Falta la clau de l\'API de YouTube (YOUTUBE_API_KEY).');
        process.exit(1);
    }

    if (!fs.existsSync(FEED_PATH)) {
        console.log('No s\'ha trobat l\'arxiu feed.json.');
        return;
    }

    if (!fs.existsSync(CHANNELS_PATH)) {
        console.error('🚫 Error: No s\'ha trobat l\'arxiu channels-ca.json.');
        process.exit(1);
    }

    const channelsData = loadJson(CHANNELS_PATH, {});
    const activeChannelIds = getActiveChannelIds(channelsData);

    if (activeChannelIds.size === 0) {
        console.error('🚫 Error: No hi ha canals actius vàlids a channels-ca.json.');
        process.exit(1);
    }

    const feedData = loadJson(FEED_PATH, {});
    const originalVideos = Array.isArray(feedData.videos) ? feedData.videos : [];

    if (originalVideos.length === 0) {
        const { cleanedChannels, removedCount: removedChannelMetaCount } = removeInactiveChannelMetadata(feedData.channels, activeChannelIds);
        if (removedChannelMetaCount > 0) {
            feedData.channels = cleanedChannels;
            fs.writeFileSync(FEED_PATH, JSON.stringify(feedData, null, 2));
            console.log(`🧼 No hi havia vídeos, però s'han eliminat ${removedChannelMetaCount} metadades de canals inactius.`);
        } else {
            console.log('No hi ha vídeos al feed per netejar.');
        }
        return;
    }

    const candidateVideos = [];
    let removedByInactiveChannel = 0;

    for (const video of originalVideos) {
        const channelId = String(video?.channelId || '').trim();
        if (!channelId || !activeChannelIds.has(channelId)) {
            removedByInactiveChannel += 1;
            continue;
        }
        candidateVideos.push(video);
    }

    console.log(`🧹 Iniciant neteja de ${originalVideos.length} vídeos...`);
    if (removedByInactiveChannel > 0) {
        console.log(`🗂️ Vídeos eliminats per canal inactiu: ${removedByInactiveChannel}`);
    }

    const validVideos = [];
    const chunkSize = 50;

    for (let i = 0; i < candidateVideos.length; i += chunkSize) {
        const chunk = candidateVideos.slice(i, i + chunkSize);
        const ids = chunk.map((v) => v.id).join(',');

        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails&id=${ids}&key=${API_KEY}`);
            const data = await response.json();

            // ESCUT DE SEGURETAT: Si l'API falla, NO esborrem res del bloc. Guardem els vídeos.
            if (!response.ok || data.error) {
                console.error(`⚠️ Error de l'API de YouTube (bloc no esborrat): ${data.error?.message || response.statusText}`);
                chunk.forEach((video) => validVideos.push(video));
                continue;
            }

            if (data.items) {
                const validIds = new Map();
                data.items.forEach((item) => {
                    const isPublic = item.status?.privacyStatus === 'public';
                    const duration = item.contentDetails?.duration;

                    if (isPublic && duration && duration !== 'P0D' && duration !== 'PT0S') {
                        validIds.set(item.id, true);
                    }
                });

                chunk.forEach((video) => {
                    if (validIds.has(video.id)) {
                        validVideos.push(video);
                    } else {
                        console.log(`🗑️ Vídeo suprimit o privat detectat i eliminat: ${video.id}`);
                    }
                });
            } else {
                chunk.forEach((video) => validVideos.push(video));
            }
        } catch (error) {
            console.error('Error de connexió de xarxa, guardant bloc:', error);
            chunk.forEach((video) => validVideos.push(video));
        }
    }

    const removedByApi = candidateVideos.length - validVideos.length;
    const removedCount = removedByInactiveChannel + removedByApi;

    const { cleanedChannels, removedCount: removedChannelMetaCount } = removeInactiveChannelMetadata(feedData.channels, activeChannelIds);

    if (removedCount > 0 || removedChannelMetaCount > 0) {
        feedData.videos = validVideos;
        feedData.channels = cleanedChannels;
        fs.writeFileSync(FEED_PATH, JSON.stringify(feedData, null, 2));
        console.log(
            `✅ Neteja completada. Vídeos esborrats: ${removedCount} ` +
            `(canal inactiu: ${removedByInactiveChannel}, API: ${removedByApi}). ` +
            `Vídeos restants: ${validVideos.length}. ` +
            `Canals eliminats de metadades: ${removedChannelMetaCount}.`
        );
    } else {
        console.log('✅ El feed ja està net o no s\'ha pogut verificar cap vídeo.');
    }
}

cleanFeed();
