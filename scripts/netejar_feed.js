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
    const chunkSize = 50; // L'API de YouTube permet consultar fins a 50 IDs per petició

    // Recorrem tots els vídeos en blocs de 50
    for (let i = 0; i < originalVideos.length; i += chunkSize) {
        const chunk = originalVideos.slice(i, i + chunkSize);
        const ids = chunk.map(v => v.id).join(',');
        
        try {
            // Demanem a YouTube l'estat i la durada de cada vídeo
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails&id=${ids}&key=${API_KEY}`);
            const data = await response.json();
            
            if (data.items) {
                // Creem un registre amb els vídeos que responen bé i són públics
                const validIds = new Map();
                data.items.forEach(item => {
                    const isPublic = item.status?.privacyStatus === 'public';
                    const duration = item.contentDetails?.duration;
                    
                    // Si el vídeo és públic i no té durada "zero" (PT0S)
                    if (isPublic && duration && duration !== 'P0D' && duration !== 'PT0S') {
                        validIds.set(item.id, true);
                    }
                });

                // Creuem les dades: si l'ID no està al registre validIds, és privat o no existeix
                chunk.forEach(video => {
                    if (validIds.has(video.id)) {
                        validVideos.push(video);
                    } else {
                        console.log(`🗑️ Vídeo suprimit, ocult o no emès detectat i eliminat: ${video.id} - ${video.title || 'Sense títol'}`);
                    }
                });
            }
        } catch (error) {
            console.error(`Error comprovant bloc de vídeos:`, error);
            // En cas d'error de connexió guardem els vídeos per no esborrar-los per error
            chunk.forEach(video => validVideos.push(video));
        }
    }

    const removedCount = originalVideos.length - validVideos.length;
    
    // Actualitzem l'arxiu feed.json només si s'ha fet neteja
    if (removedCount > 0) {
        feedData.videos = validVideos;
        fs.writeFileSync(FEED_PATH, JSON.stringify(feedData, null, 2));
        console.log(`✅ Neteja completada. Vídeos revisats: ${originalVideos.length}. Vídeos esborrats: ${removedCount}. Vídeos restants: ${validVideos.length}.`);
    } else {
        console.log('✅ El feed ja està net, no s\'ha eliminat cap vídeo.');
    }
}

cleanFeed();
