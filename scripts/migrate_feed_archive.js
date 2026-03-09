const fs = require('fs');
const path = require('path');

const FEED_PATH = path.join(process.cwd(), 'data', 'feed.json');
const ARCHIVE_DIR = path.join(process.cwd(), 'data', 'archive');
const CHANNEL_ARCHIVE_DIR = path.join(ARCHIVE_DIR, 'channels');

const CHANNEL_LIMITS = {
    youtuber: 50,
    entitat: 30,
    digitalMitja: 15
};

function normalizeCategory(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .toLowerCase();
}

function getChannelTypeLimit(categories) {
    const normalized = Array.isArray(categories) ? categories.map(normalizeCategory) : [];
    if (normalized.includes('entitats') || normalized.includes('entitat')) {
        return CHANNEL_LIMITS.entitat;
    }
    if (normalized.includes('digitals') || normalized.includes('digital') || normalized.includes('mitjans') || normalized.includes('mitja')) {
        return CHANNEL_LIMITS.digitalMitja;
    }
    return CHANNEL_LIMITS.youtuber;
}

function mergeVideosById(existingVideos, incomingVideos) {
    const merged = new Map();
    (existingVideos || []).forEach((video) => {
        if (video?.id) merged.set(video.id, video);
    });
    (incomingVideos || []).forEach((video) => {
        if (video?.id) merged.set(video.id, video);
    });
    return Array.from(merged.values()).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function splitVideosForFeedAndArchive(videos, channelCategoriesById) {
    const videosByChannel = new Map();
    videos.forEach((video) => {
        const key = video.channelId || video.sourceChannelId || '';
        if (!key) return;
        if (!videosByChannel.has(key)) videosByChannel.set(key, []);
        videosByChannel.get(key).push(video);
    });

    const feedVideos = [];
    const archiveOverflowByChannel = new Map();

    videosByChannel.forEach((entries, channelKey) => {
        const sorted = entries.slice().sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        const limit = getChannelTypeLimit(channelCategoriesById.get(channelKey) || []);
        feedVideos.push(...sorted.slice(0, limit));
        const overflow = sorted.slice(limit);
        if (overflow.length > 0) {
            archiveOverflowByChannel.set(channelKey, overflow);
        }
    });

    return {
        feedVideos: feedVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
        archiveOverflowByChannel
    };
}

function readJsonFileIfExists(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getLegacyArchiveFiles() {
    if (!fs.existsSync(ARCHIVE_DIR)) {
        return [];
    }

    return fs.readdirSync(ARCHIVE_DIR)
        .filter((name) => name.endsWith('.json'))
        .filter((name) => name !== 'index.json')
        .map((name) => path.join(ARCHIVE_DIR, name));
}

function main() {
    if (!fs.existsSync(FEED_PATH)) {
        throw new Error(`No s'ha trobat ${FEED_PATH}`);
    }

    const parsed = JSON.parse(fs.readFileSync(FEED_PATH, 'utf8'));
    const feedVideos = Array.isArray(parsed.videos) ? parsed.videos : [];

    const channelCategoriesById = new Map();
    const channelsMap = parsed.channels && typeof parsed.channels === 'object' ? parsed.channels : {};
    Object.entries(channelsMap).forEach(([channelId, channel]) => {
        channelCategoriesById.set(channelId, channel?.categories || []);
    });
    feedVideos.forEach((video) => {
        const channelKey = video.channelId || video.sourceChannelId;
        if (!channelKey || channelCategoriesById.has(channelKey)) return;
        channelCategoriesById.set(channelKey, video.categories || []);
    });

    const { feedVideos: compactFeedVideos, archiveOverflowByChannel } = splitVideosForFeedAndArchive(feedVideos, channelCategoriesById);

    const legacyArchiveFiles = getLegacyArchiveFiles();
    legacyArchiveFiles.forEach((archivePath) => {
        const parsedArchive = readJsonFileIfExists(archivePath);
        const videos = Array.isArray(parsedArchive?.videos) ? parsedArchive.videos : [];
        videos.forEach((video) => {
            const channelKey = video.channelId || video.sourceChannelId;
            if (!channelKey) return;
            const existing = archiveOverflowByChannel.get(channelKey) || [];
            existing.push(video);
            archiveOverflowByChannel.set(channelKey, existing);
        });
    });

    const channelArchivesToWrite = [];
    for (const [channelId, videos] of archiveOverflowByChannel.entries()) {
        const archivePath = path.join(CHANNEL_ARCHIVE_DIR, `${channelId}.json`);
        const existingArchive = readJsonFileIfExists(archivePath);
        const existingVideos = Array.isArray(existingArchive?.videos) ? existingArchive.videos : [];
        const merged = mergeVideosById(existingVideos, videos);
        if (merged.length > 0) {
            channelArchivesToWrite.push({
                channelId,
                videos: merged
            });
        }
    }

    if (channelArchivesToWrite.length > 0) {
        fs.mkdirSync(CHANNEL_ARCHIVE_DIR, { recursive: true });
        const generatedAt = new Date().toISOString();
        channelArchivesToWrite.forEach(({ channelId, videos }) => {
            fs.writeFileSync(
                path.join(CHANNEL_ARCHIVE_DIR, `${channelId}.json`),
                JSON.stringify({ channelId, generatedAt, videos }, null, 2)
            );
        });
    }

    const updatedFeed = {
        ...parsed,
        generatedAt: new Date().toISOString(),
        videos: compactFeedVideos
    };
    fs.writeFileSync(FEED_PATH, JSON.stringify(updatedFeed, null, 2));

    console.log(`✅ Migració completada. feed.json: ${compactFeedVideos.length} vídeos amb límits per tipus de canal.`);
    console.log(`🗂️ Arxiu per canal: ${channelArchivesToWrite.length} fitxers creats/actualitzats a ${CHANNEL_ARCHIVE_DIR} (lazy).`);
    console.log(`📚 Compatibilitat: ${legacyArchiveFiles.length} buckets antics llegits durant la migració.`);
}

main();
