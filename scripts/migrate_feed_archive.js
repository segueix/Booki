const fs = require('fs');
const path = require('path');

const FEED_KEEP_PER_CHANNEL = Math.max(1, Number.parseInt(process.env.FEED_KEEP_PER_CHANNEL ?? '20', 10));
const FEED_PATH = path.join(process.cwd(), 'data', 'feed.json');
const ARCHIVE_DIR = path.join(process.cwd(), 'data', 'archive');

function monthKeyFromDate(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
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

function splitVideosForFeedAndArchive(videos, keepPerChannel) {
    const videosByChannel = new Map();
    videos.forEach((video) => {
        const key = video.sourceChannelId || video.channelId || '';
        if (!key) return;
        if (!videosByChannel.has(key)) videosByChannel.set(key, []);
        videosByChannel.get(key).push(video);
    });

    const feedVideos = [];
    const archiveOverflowVideos = [];
    videosByChannel.forEach((entries) => {
        const sorted = entries.slice().sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        feedVideos.push(...sorted.slice(0, keepPerChannel));
        archiveOverflowVideos.push(...sorted.slice(keepPerChannel));
    });

    return {
        feedVideos: feedVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
        archiveOverflowVideos
    };
}

function main() {
    if (!fs.existsSync(FEED_PATH)) {
        throw new Error(`No s'ha trobat ${FEED_PATH}`);
    }

    const raw = fs.readFileSync(FEED_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const videos = Array.isArray(parsed.videos) ? parsed.videos : [];

    const { feedVideos, archiveOverflowVideos } = splitVideosForFeedAndArchive(videos, FEED_KEEP_PER_CHANNEL);

    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

    const monthlyOverflow = new Map();
    archiveOverflowVideos.forEach((video) => {
        const monthKey = monthKeyFromDate(video.publishedAt);
        if (!monthKey) return;
        if (!monthlyOverflow.has(monthKey)) monthlyOverflow.set(monthKey, []);
        monthlyOverflow.get(monthKey).push(video);
    });

    for (const [monthKey, vids] of monthlyOverflow.entries()) {
        const archivePath = path.join(ARCHIVE_DIR, `${monthKey}.json`);
        let existingVideos = [];
        if (fs.existsSync(archivePath)) {
            const existing = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
            existingVideos = Array.isArray(existing.videos) ? existing.videos : [];
        }

        const mergedVideos = mergeVideosById(existingVideos, vids);
        fs.writeFileSync(archivePath, JSON.stringify({ month: monthKey, generatedAt: new Date().toISOString(), videos: mergedVideos }, null, 2));
    }

    const updatedFeed = {
        ...parsed,
        generatedAt: new Date().toISOString(),
        videos: feedVideos
    };
    fs.writeFileSync(FEED_PATH, JSON.stringify(updatedFeed, null, 2));

    console.log(`✅ Migració completada. feed.json: ${feedVideos.length} vídeos (max ${FEED_KEEP_PER_CHANNEL} per canal).`);
    console.log(`🗂️ Overflow enviat a ${ARCHIVE_DIR} (${archiveOverflowVideos.length} vídeos).`);
}

main();
