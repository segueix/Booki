const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FEED_PATH = path.join(ROOT, 'data', 'feed.json');
const ARCHIVE_DIR = path.join(ROOT, 'data', 'archive', 'channels');
const OUTPUT_PATH = path.join(ROOT, 'data', 'search_index.json');

async function readJson(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
}

function toCompactVideo(video, fallbackChannelId = '') {
    const id = video?.id;
    const title = video?.title;
    if (!id || !title) {
        return null;
    }

    return {
        i: String(id),
        t: String(title),
        c: String(video?.channelId || fallbackChannelId || ''),
        d: String(video?.publishedAt || '')
    };
}

async function main() {
    const feed = await readJson(FEED_PATH);
    const feedVideos = Array.isArray(feed?.videos) ? feed.videos : [];
    const recentVideoIds = new Set(
        feedVideos
            .map(video => String(video?.id || ''))
            .filter(Boolean)
    );

    const archiveFiles = (await fs.readdir(ARCHIVE_DIR))
        .filter(file => file.endsWith('.json'));

    const compact = [];
    const seenArchiveIds = new Set();

    for (const fileName of archiveFiles) {
        const filePath = path.join(ARCHIVE_DIR, fileName);
        const archive = await readJson(filePath);
        const channelId = String(archive?.channelId || path.basename(fileName, '.json'));
        const videos = Array.isArray(archive?.videos) ? archive.videos : [];

        for (const video of videos) {
            const videoId = String(video?.id || '');
            if (!videoId || recentVideoIds.has(videoId) || seenArchiveIds.has(videoId)) {
                continue;
            }
            const compactVideo = toCompactVideo(video, channelId);
            if (!compactVideo) {
                continue;
            }
            compact.push(compactVideo);
            seenArchiveIds.add(videoId);
        }
    }

    compact.sort((a, b) => new Date(b.d || 0).getTime() - new Date(a.d || 0).getTime());

    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(compact)}\n`, 'utf8');
    console.log(`Índex de cerca generat: ${compact.length} vídeos -> data/search_index.json`);
}

main().catch(error => {
    console.error('Error generant search_index.json:', error);
    process.exitCode = 1;
});
