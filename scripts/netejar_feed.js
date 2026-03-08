const fs = require('fs');
const path = require('path');

const FEED_PATH = path.join(__dirname, '../data/feed.json');
const API_KEY = process.env.YOUTUBE_API_KEY;

async function cleanFeed() {
    if (!API_KEY) {
        console.error('🚫 Error: Falta la clau de l\'API de YouTube (YOUTUBE_API_KEY).');
        process.exit(1);
    }

    if (!fs.existsSync(FEED_PATH)) {
        console.log('No s\'ha trobat l\'arxiu feed.json.');
        return;
    }

    let feedData = JSON.parse(fs.readFileSync(FEED_PATH, 'utf8'));
    let originalVideos = feedData.videos || [];
    
    if (originalVideos.length === 0) {
        console.log('No hi ha vídeos al feed per netejar.');
        return;
    }

    console.log(`🧹 Iniciant neteja de ${originalVideos.length} vídeos...`);

    const validVideos = [];
    const chunkSize = 50; 

    for (let i = 0; i < originalVideos.length; i += chunkSize) {
        const chunk = originalVideos.slice(i, i + chunkSize);
        const ids = chunk.map(v => v.id).join(',');
        
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails&id=${ids}&key=${API_KEY}`);
            const data = await response.json();
            
            // ESCUT DE SEGURETAT: Si l'API falla, NO esborrem res. Guardem els vídeos.
            if (!response.ok || data.error) {
                console.error(`⚠️ Error de l'API de YouTube (bloc no esborrat): ${data.error?.message || response.statusText}`);
                chunk.forEach(video => validVideos.push(video));
                continue; 
            }
            
            if (data.items) {
                const validIds = new Map();
                data.items.forEach(item => {
                    const isPublic = item.status?.privacyStatus === 'public';
                    const duration = item.contentDetails?.duration;
                    
                    // Nomes marquem com a vàlids els públics i que no durin 0 segons
                    if (isPublic && duration && duration !== 'P0D' && duration !== 'PT0S') {
                        validIds.set(item.id, true);
                    }
                });

                // Creuem les dades: només esborrem si YouTube ha respost explícitament que no hi són
                chunk.forEach(video => {
                    if (validIds.has(video.id)) {
                        validVideos.push(video);
                    } else {
                        console.log(`🗑️ Vídeo suprimit o privat detectat i eliminat: ${video.id}`);
                    }
                });
            } else {
                chunk.forEach(video => validVideos.push(video));
            }
        } catch (error) {
            console.error(`Error de connexió de xarxa, guardant bloc:`, error);
            chunk.forEach(video => validVideos.push(video));
        }
    }

    const removedCount = originalVideos.length - validVideos.length;
    
    if (removedCount > 0) {
        feedData.videos = validVideos;
        fs.writeFileSync(FEED_PATH, JSON.stringify(feedData, null, 2));
        console.log(`✅ Neteja completada. Vídeos esborrats: ${removedCount}. Vídeos restants: ${validVideos.length}.`);
    } else {
        console.log('✅ El feed ja està net o no s\'ha pogut verificar cap vídeo.');
    }
}

cleanFeed();
