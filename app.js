const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const NodeCache = require('node-cache');

const basenya = "https://api-otakudesu-livid.vercel.app";
const app = express();
const cache = new NodeCache({ stdTTL: 86400 }); // Cache data for 24 hours (86400 seconds)

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Helper function to fetch ongoing anime list with caching
async function fetchAnimeData(page) {
    const cacheKey = `ongoingAnime_${page}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    try {
        const response = await axios.get(`${basenya}/api/v1/ongoing/${page}`);
        const data = response.data.ongoing || [];
        cache.set(cacheKey, data);
        return data;
    } catch (error) {
        console.error('Error fetching data:', error.message);
        return [];
    }
}

// Function to fetch anime search results with caching
async function searchAnime(query) {
    const cacheKey = `searchAnime_${query}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    try {
        const response = await axios.get(`${basenya}/api/v1/search/${encodeURIComponent(query)}`);
        const data = response.data.search || [];
        cache.set(cacheKey, data);
        return data;
    } catch (error) {
        console.error('Error searching anime:', error.message);
        return [];
    }
}

// Function to fetch anime details and episode list with caching
async function fetchAnimeDetail(endpoint) {
    const cacheKey = `animeDetail_${endpoint}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    try {
        const response = await axios.get(`${basenya}/api/v1/detail/${endpoint}`);
        const animeDetail = response.data || {};

        // Filter episodes that have valid 'episode-' prefix
        animeDetail.episode_list = (animeDetail.episode_list || []).filter(episode =>
            episode.episode_endpoint.includes("episode-")
        );

        cache.set(cacheKey, animeDetail);
        return animeDetail;
    } catch (error) {
        console.error('Error fetching anime detail:', error.message);
        return {};
    }
}

// Function to fetch streaming link for an episode with caching
async function fetchEpisodeStream(endpoint) {
    const cacheKey = `episodeStream_${endpoint}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    try {
        const response = await axios.get(`${basenya}/api/v1/episode/${endpoint}`);
        const data = response.data || {};
        cache.set(cacheKey, data);
        return data;
    } catch (error) {
        console.error('Error fetching episode stream:', error.message);
        return {};
    }
}

// Rest of the code for handling routes remains the same...

// Function to truncate the pagination display
function getPagination(currentPage, totalPages) {
    const delta = 2;
    const range = [];
    let start = Math.max(2, currentPage - delta);
    let end = Math.min(totalPages - 1, currentPage + delta);

    if (currentPage - delta <= 1) end = Math.min(5, totalPages - 1);
    if (currentPage + delta >= totalPages) start = Math.max(totalPages - 4, 2);

    for (let i = start; i <= end; i++) range.push(i);
    if (start > 2) range.unshift('...');
    if (end < totalPages - 1) range.push('...');
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);

    return range;
}

// Endpoint for displaying anime list with pagination and search
app.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        let animeData;

        if (search) {
            const searchResults = await searchAnime(search);
            animeData = await Promise.all(searchResults.map(anime => fetchAnimeDetail(anime.endpoint)));
        } else {
            const ongoingAnime = await fetchAnimeData(page);
            animeData = await Promise.all(ongoingAnime.map(anime => fetchAnimeDetail(anime.endpoint)));
        }

        const pageSize = 10;
        const paginatedAnime = animeData.slice((page - 1) * pageSize, page * pageSize);
        const totalPages = Math.ceil(animeData.length / pageSize);
        const pagination = getPagination(page, totalPages);

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>PurNime - Streaming Anime & Donghua</title>
                <meta name="description" content="PurNime adalah situs streaming anime dan donghua dengan koleksi episode terbaru dan populer.">
                <meta name="keywords" content="PurNime, streaming anime, streaming donghua, nonton anime, nonton donghua, anime online, donghua online">
                <meta name="google-adsense-account" content="ca-pub-5220496608138780">
                <link rel="icon" href="https://th.bing.com/th/id/OIG1.zckrRMeI76ehRbucAgma?dpr=2&pid=ImgDetMain" type="image/x-icon">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css">
                <style>
                    body { 
                        background-color: #121212; 
                        color: #fff; 
                        font-family: 'Arial', sans-serif;
                    }
                    .anime-thumbnail { 
                        max-height: 230px; 
                        border-radius: 10px; 
                    }
                    .card {
                        border: none;
                        background: transparent;
                    }
                    .card-title {
                        font-size: 1.2rem;
                        font-weight: 600;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .card-text {
                        font-size: 0.9rem;
                        color: #a0a0a0;
                    }
                    .btn-primary {
                        background-color: #007bff;
                        border: none;
                        border-radius: 5px;
                        padding: 8px 16px;
                        font-size: 0.9rem;
                    }
                    .btn-primary:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <div class="container mt-5">
                    <h1 class="text-center mb-4">PUR-NIME TV</h1>
                    <form class="d-flex justify-content-center mb-4">
                        <input class="form-control me-2" type="search" name="search" placeholder="Search Anime" aria-label="Search" value="${search}">
                        <button class="btn btn-outline-light" type="submit">Search</button>
                    </form>
                    <div class="row row-cols-1 row-cols-md-3 g-4">
                        ${paginatedAnime.map(anime => `
                            <div class="col">
                                <div class="card h-100 text-white">
                                    <a href="/anime/${anime.endpoint}" style="text-decoration: none;"> 
                                        <img src="${anime.anime_detail.thumb}" class="card-img-top anime-thumbnail" alt="${anime.anime_detail.title}">
                                        <div class="card-body">
                                            <h5 class="card-title">${anime.anime_detail.title}</h5>
                                            <p class="card-text">${anime.anime_detail.detail[2]} - ${anime.anime_detail.detail[6]}</p>
                                            <p class="card-text">${anime.episode_list[0]?.episode_date || ''}</p>
                                            <p class="card-text">${anime.anime_detail.detail[7]}</p>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <nav aria-label="Page navigation" class="mt-4">
                        <ul class="pagination justify-content-center">
                            ${pagination.map(p => `
                                <li class="page-item ${p === page ? 'active' : ''} ${typeof p === 'number' ? '' : 'disabled'}">
                                    <a class="page-link bg-dark text-light" href="/?page=${p === '...' ? page : p}&search=${search}">${p}</a>
                                </li>
                            `).join('')}
                        </ul>
                    </nav>
                </div>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error rendering home page:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint for streaming anime episodes
app.get('/anime/:animeId/:episode?', async (req, res) => {
    try {
        const animeId = req.params.animeId;
        const episodeNumber = parseInt(req.params.episode) || 1;

        const animeDetail = await fetchAnimeDetail(animeId);
        const episodeList = animeDetail.episode_list || [];

        if (episodeNumber < 1 || episodeNumber > episodeList.length) {
            return res.status(404).send('Episode not found');
        }

        const selectedEpisode = episodeList[episodeList.length - episodeNumber];
        const episodeData = await fetchEpisodeStream(selectedEpisode.episode_endpoint);

        // Prepare streaming options
        const serverOptions = [];
        const mirrors = ['mirror_embed1', 'mirror_embed2', 'mirror_embed3'];

        mirrors.forEach(mirrorKey => {
            const mirrorData = episodeData[mirrorKey];
            if (mirrorData && mirrorData.straming.length > 0) {
                mirrorData.straming.forEach(server => {
                    serverOptions.push({
                        name: `${server.driver.trim()} - ${mirrorData.quality}`,
                        link: server.link
                    });
                });
            }
        });

        // Determine the selected streaming URL
        let streamingUrl = episodeData.streamLink; // Default streamLink
        if (req.query.server) {
            const selectedServer = serverOptions.find(server => server.name === req.query.server);
            if (selectedServer) {
                const streamResponse = await axios.get(`${basenya}${selectedServer.link}`);
                streamingUrl = streamResponse.data.streaming_url || streamingUrl;
            }
        }

        const nextEpisode = episodeNumber + 1;
        const prevEpisode = episodeNumber - 1;

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${animeDetail.anime_detail.title} - Episode ${episodeNumber} | PurNime</title>
                <meta name="description" content="Tonton ${animeDetail.anime_detail.title} episode ${episodeNumber} di PurNime, situs streaming anime dan donghua terbaik.">
                <meta name="keywords" content="${animeDetail.anime_detail.title}, streaming anime, streaming donghua, nonton anime, nonton donghua">
                <meta name="google-adsense-account" content="ca-pub-5220496608138780">
                <link rel="icon" href="https://th.bing.com/th/id/OIG1.zckrRMeI76ehRbucAgma?dpr=2&pid=ImgDetMain" type="image/x-icon">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css">
                <style>
                    body { background-color: #121212; color: #fff; }
                    .iframe-container { position: relative; width: 100%; padding-bottom: 56.25%; height: 0; }
                    .iframe-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
                </style>
            </head>
            <body>
                <div class="container mt-5">
                    <h1>${animeDetail.anime_detail.title}</h1>
                    <div class="d-flex justify-content-between mb-4">
                        <a href="/" class="btn btn-outline-light">Home</a>
                        <form method="GET" class="d-inline-flex">
                            <input type="hidden" name="episode" value="${episodeNumber}">
                            <select name="server" class="form-select me-2" onchange="this.form.submit()">
                                <option selected disabled>Select Server</option>
                                ${serverOptions.map(server => `
                                    <option value="${server.name}" ${req.query.server === server.name ? 'selected' : ''}>
                                        ${server.name}
                                    </option>
                                `).join('')}
                            </select>
                            <noscript><button type="submit" class="btn btn-outline-light">Switch</button></noscript>
                        </form>
                    </div>
                    <div class="iframe-container">
                        <iframe src="${streamingUrl}" frameborder="0" allowfullscreen></iframe>
                    </div>
                    <div class="d-flex justify-content-between mt-4">
                        <a href="/anime/${animeId}/${prevEpisode}" class="btn btn-outline-light ${prevEpisode < 1 ? 'disabled' : ''}">Previous Episode</a>
                        <a href="/anime/${animeId}/${nextEpisode}" class="btn btn-outline-light ${nextEpisode > episodeList.length ? 'disabled' : ''}">Next Episode</a>
                    </div>
                    <div class="mt-4">
                        <h2>List Episode</h2>
                        <div class="list-group">
                            ${episodeList.map(episode => `
                                <a href="/anime/${animeId}/${episodeList.length - episodeList.indexOf(episode)}" class="list-group-item list-group-item-action ${episode.episode_endpoint === selectedEpisode.episode_endpoint ? 'active' : ''}">
                                    ${episode.episode_title}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                    <div class="mt-4">
                        <h3>Synopsis</h3>
                        <p>${animeDetail.anime_detail.sinopsis}</p>
                    </div>
                </div>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error rendering stream page:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint for handling anime details
app.get('/anime/:animeId', async (req, res) => {
    try {
        const animeId = req.params.animeId;
        const animeDetail = await fetchAnimeDetail(animeId);

        // Render the anime details page, including the episode list
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${animeDetail.anime_detail.title} | PurNime</title>
                <meta name="description" content="${animeDetail.anime_detail.sinopsis}">
                <meta name="keywords" content="${animeDetail.anime_detail.title}, streaming anime, streaming donghua, nonton anime, nonton donghua">
                <meta name="google-adsense-account" content="ca-pub-5220496608138780">
                <link rel="icon" href="https://th.bing.com/th/id/OIG1.zckrRMeI76ehRbucAgma?dpr=2&pid=ImgDetMain" type="image/x-icon">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css">
                <style>
                    body { background-color: #121212; color: #fff; }
                </style>
            </head>
            <body>
                <div class="container mt-5">
                    <h1>${animeDetail.anime_detail.title}</h1>
                    <div class="row">
                        <div class="col-md-4">
                            <img src="${animeDetail.anime_detail.thumb}" class="img-fluid" alt="${animeDetail.anime_detail.title}">
                        </div>
                        <div class="col-md-8">
                            <h3>Synopsis:</h3>
                            <p>${animeDetail.anime_detail.sinopsis}</p>
                            <h3>Details:</h3>
                            <ul>
                                ${animeDetail.anime_detail.detail.map(detail => `<li>${detail}</li>`).join('')}
                            </ul>
                            <h3>Genre:</h3>
                            <ul>
                                ${animeDetail.anime_detail.genres.map(genre => `<li>${genre}</li>`).join('')}
                            </ul>
                            <h3>Episode List:</h3>
                            <ul>
                                ${animeDetail.episode_list.map((episode, index) => `
                                    <li>
                                        <a href="/anime/${animeId}/${index + 1}">${episode.episode_title}</a>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error rendering anime details page:', error.message);
        res.status(500).send('Internal Server Error');
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
