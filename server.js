const express = require('express');
const path = require('path');
const { tmdb, img, slugify } = require('./lib/tmdb');
const { 
  head, 
  layout, 
  posterCard, 
  genreRow, 
  trailerBlock, 
  castGrid, 
  escapeHtml, 
  movieJsonLd, 
  tvJsonLd, 
  sideBannerAd, 
  nativeBannerAd, 
  similarSection, 
  DEFAULT_TITLE, 
  DEFAULT_DESC, 
  SITE_NAME 
} = require('./lib/render');

const app = express();
const PORT = process.env.PORT || 3000;

const SITE_URL = 'https://cinflixhd.up.railway.app';

app.use(express.static(path.join(__dirname, 'public')));

const ROWS = {
  movie: [
    { key: '01', title: 'Films Tendances', path: '/trending/movie/week' },
    { key: '02', title: 'Films Populaires', path: '/movie/popular' },
    { key: '03', title: 'Mieux Notés', path: '/movie/top_rated' },
    { key: '04', title: 'Prochaines Sorties', path: '/movie/upcoming' },
  ],
  tv: [
    { key: '01', title: 'Séries Tendances', path: '/trending/tv/week' },
    { key: '02', title: 'Séries Populaires', path: '/tv/popular' },
    { key: '03', title: 'Séries Mieux Notées', path: '/tv/top_rated' },
    { key: '04', title: 'Séries en Diffusion', path: '/tv/on_the_air' },
  ],
};

function seoTitle(kind, title, year) {
  const label = kind === 'movie' ? 'Film' : 'Série';
  const y = year || 'année inconnue';
  return `[${label}] ${title} (${y}) Synopsis, Avis, Casting et Streaming HD`;
}

function seoDescription(title, year, genreNames) {
  const yearPart = year ? `${year}, ` : '';
  const genrePart = genreNames ? `genre ${genreNames}, ` : '';
  return `Synopsis, casting, avis et bande-annonce officielle de ${title}. ${genrePart}${yearPart}tout ce que vous devez savoir sur ce titre.`;
}

// ---------- HOME (/, /movie, /tv) ----------
async function renderHome(req, res, tab) {
  try {
    const heroData = await tmdb(tab === 'movie' ? '/trending/movie/week' : '/trending/tv/week');
    const hero = heroData.results[0];
    const heroTitle = hero ? (hero.title || hero.name) : SITE_NAME;
    const heroOverview = hero ? (hero.overview || '') : '';

    const rowsHtml = [];
    for (const def of ROWS[tab]) {
      const data = await tmdb(def.path);
      const cards = data.results.slice(0, 12).map(item => posterCard(item, tab)).join('');
      rowsHtml.push(`
        <section class="row">
          <div class="row-head"><span class="row-num">${def.key}</span><h2>${def.title}</h2></div>
          <div class="grid">${cards}</div>
        </section>
      `);
    }

    const heroHtml = hero ? `
      <div id="hero">
        <div class="hero-bg" style="background-image:url('${img(hero.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="hero-content">
          <div class="hero-eyebrow">À l'Affiche de la Semaine</div>
          <div class="hero-title">${escapeHtml(heroTitle)}</div>
          <div class="hero-overview">${escapeHtml(heroOverview).slice(0, 180)}${heroOverview.length > 180 ? '…' : ''}</div>
          <a class="hero-btn" href="/${tab}/${hero.id}/${encodeURIComponent(slugify(heroTitle))}">Voir Plus ▸</a>
        </div>
      </div>` : '';

    const bodyHtml = heroHtml + `<div id="rows">${rowsHtml.join('')}</div>`;

    const headHtml = head({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      url: `${SITE_URL}/${tab}`,
      image: hero ? img(hero.backdrop_path, 'w780') : null,
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: tab }));
  } catch (e) {
    res.status(500).send(layout({
      headHtml: head({ title: DEFAULT_TITLE, description: DEFAULT_DESC, url: `${SITE_URL}/${tab}` }),
      bodyHtml: `<div class="empty">Impossible de charger les données. Veuillez réessayer plus tard.</div>`,
      activeTab: tab,
    }));
  }
}

app.get('/', (req, res) => renderHome(req, res, 'movie'));
app.get('/movie', (req, res) => renderHome(req, res, 'movie'));
app.get('/tv', (req, res) => renderHome(req, res, 'tv'));

// ---------- DETAIL FILM: /movie/:id/:slug? ----------
app.get('/movie/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const data = await tmdb(`/movie/${id}`, {
      append_to_response: 'credits,videos,similar'
    });
    
    const correctSlug = slugify(data.title);
    if (req.params.slug !== correctSlug) {
      return res.redirect(301, `/movie/${id}/${encodeURIComponent(correctSlug)}`);
    }

    const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}min` : 'N/D';
    
    const credits = data.credits || {};
    const videos = data.videos || {};
    const similar = data.similar || {};

    const bodyHtml = `
      <a class="back-btn" href="/movie">← Retour</a>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="Affiche de ${escapeHtml(data.title)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">Film</div>
          <h1 class="detail-title">${escapeHtml(data.title)}</h1>
          <div class="detail-orig">${escapeHtml(data.original_title)} · ${(data.release_date || '').slice(0, 4) || 'Année inconnue'}</div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${runtime}</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
          </div>
          ${genreRow(data.genres)}
          <a href="/watch/${id}" class="watch-btn" style="display:inline-block; margin-top:15px; padding:10px 20px; background:#e50914; color:#fff; text-decoration:none; border-radius:4px; font-weight:bold;">Regarder Maintenant</a>
        </div>
      </div>
      <div class="section-block"><h3>Synopsis</h3><div class="bio-text">${escapeHtml(data.overview) || 'Aucun synopsis disponible.'}</div></div>
      ${nativeBannerAd()}
      <div class="section-block"><h3>Bande-annonce</h3>${trailerBlock(videos)}</div>
      <div class="section-block"><h3>Casting</h3>${castGrid(credits)}</div>
      ${typeof similarSection === 'function' ? similarSection(similar) : ''}
      ${sideBannerAd()}
      ${movieJsonLd(data, `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const headHtml = head({
      title: seoTitle('movie', data.title, (data.release_date || '').slice(0, 4)),
      description: seoDescription(data.title, (data.release_date || '').slice(0, 4), (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/movie/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.movie',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({
        title: 'Film non trouvé',
        description: DEFAULT_DESC,
        url: `${SITE_URL}/movie/${id}`,
        robots: 'noindex, nofollow',
      }),
      bodyHtml: `<a class="back-btn" href="/movie">← Retour</a><div class="empty">Ce film n'a pas été trouvé.</div>`,
      activeTab: 'movie',
    }));
  }
});

// ---------- DETAIL SERIE: /tv/:id/:slug? ----------
app.get('/tv/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [data, credits, videos] = await Promise.all([
      tmdb(`/tv/${id}`),
      tmdb(`/tv/${id}/credits`),
      tmdb(`/tv/${id}/videos`),
    ]);
    const correctSlug = slugify(data.name);
    if (req.params.slug !== correctSlug) {
      return res.redirect(301, `/tv/${id}/${encodeURIComponent(correctSlug)}`);
    }

    const seasons = (data.seasons || []).filter(s => s.season_number >= 0);
    const seasonsHtml = seasons.map(s => `
      <div class="season-item" data-season="${s.season_number}" data-tv="${id}">
        <div class="season-head">
          <img src="${img(s.poster_path, 'w92')}" alt="${escapeHtml(s.name)}">
          <div>
            <div class="s-title">${escapeHtml(s.name)}</div>
            <div class="s-meta">${s.episode_count} épisodes · ${(s.air_date || '').slice(0, 4) || 'Année inconnue'}</div>
          </div>
          <div class="chev">▶</div>
        </div>
        <div class="episode-panel"></div>
      </div>
    `).join('');

    const bodyHtml = `
      <a class="back-btn" href="/tv">← Retour</a>
      <div class="detail-hero">
        <div class="hero-bg" style="background-image:url('${img(data.backdrop_path, 'original')}')"></div>
        <div class="hero-fade"></div>
        <div class="detail-poster"><img src="${img(data.poster_path)}" alt="Affiche de ${escapeHtml(data.name)}"></div>
        <div class="detail-info">
          <div class="detail-eyebrow">Série</div>
          <h1 class="detail-title">${escapeHtml(data.name)}</h1>
          <div class="detail-orig">${escapeHtml(data.original_name)} · ${(data.first_air_date || '').slice(0, 4) || 'Année inconnue'}</div>
          ${data.tagline ? `<div class="tagline">"${escapeHtml(data.tagline)}"</div>` : ''}
          <div class="detail-meta">
            <span class="m-item star">★ ${data.vote_average ? data.vote_average.toFixed(1) : '-'} / 10</span>
            <span class="m-item">${data.number_of_seasons || '-'} saisons</span>
            <span class="m-item">${data.number_of_episodes || '-'} épisodes</span>
            <span class="m-item">${escapeHtml(data.status || '')}</span>
          </div>
          ${genreRow(data.genres)}
          <a href="/watch/${id}" class="watch-btn" style="display:inline-block; margin-top:15px; padding:10px 20px; background:#e50914; color:#fff; text-decoration:none; border-radius:4px; font-weight:bold;">Regarder Maintenant</a>
        </div>
      </div>
      <div class="section-block"><h3>Synopsis</h3><div class="bio-text">${escapeHtml(data.overview) || 'Aucun synopsis disponible.'}</div></div>
      ${nativeBannerAd()}
      <div class="section-block"><h3>Bande-annonce</h3>${trailerBlock(videos)}</div>
      <div class="section-block"><h3>Casting</h3>${castGrid(credits)}</div>
      <div class="section-block">
        <h3>Saisons et Épisodes</h3>
        <div class="season-list" id="season-list">${seasonsHtml}</div>
      </div>
      ${sideBannerAd()}
      ${tvJsonLd(data, `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`)}
    `;

    const headHtml = head({
      title: seoTitle('tv', data.name, (data.first_air_date || '').slice(0, 4)),
      description: seoDescription(data.name, (data.first_air_date || '').slice(0, 4), (data.genres || []).map(g => g.name).join(', ')),
      url: `${SITE_URL}/tv/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(data.backdrop_path || data.poster_path, 'w780'),
      type: 'video.tv_show',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'tv' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({
        title: 'Série non trouvée',
        description: DEFAULT_DESC,
        url: `${SITE_URL}/tv/${id}`,
        robots: 'noindex, nofollow',
      }),
      bodyHtml: `<a class="back-btn" href="/tv">← Retour</a><div class="empty">Cette série n'a pas été trouvée.</div>`,
      activeTab: 'tv',
    }));
  }
});

// ---------- DETAIL PERSON: /person/:id/:slug? ----------
app.get('/person/:id/:slug?', async (req, res) => {
  const { id } = req.params;
  try {
    const [person, credits] = await Promise.all([
      tmdb(`/person/${id}`),
      tmdb(`/person/${id}/combined_credits`)
    ]);

    const correctSlug = slugify(person.name);
    if (req.params.slug !== correctSlug) {
      return res.redirect(301, `/person/${id}/${encodeURIComponent(correctSlug)}`);
    }

    const knownFor = (credits.cast || [])
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
      .slice(0, 12);
    
    const cards = knownFor.map(item => posterCard(item, item.media_type || 'movie')).join('');

    const bodyHtml = `
      <div style="padding: 20px; color: #fff; max-width: 1200px; margin: 0 auto;">
        <a class="back-btn" href="javascript:history.back()">← Retour</a>
        <div style="display: flex; gap: 30px; flex-wrap: wrap; margin-top: 20px;">
          <div style="flex: 0 0 250px;">
            <img src="${img(person.profile_path, 'h632')}" alt="${escapeHtml(person.name)}" style="width: 100%; border-radius: 8px; object-fit: cover;">
          </div>
          <div style="flex: 1; min-width: 280px;">
            <h1 style="margin-top: 0; font-size: 2.2rem;">${escapeHtml(person.name)}</h1>
            <p><strong>Né(e) le :</strong> ${person.birthday || 'N/D'} ${person.place_of_birth ? `(${person.place_of_birth})` : ''}</p>
            <h3 style="margin-top: 20px;">Biographie</h3>
            <div style="line-height: 1.6; color: #ccc; max-height: 250px; overflow-y: auto;">${escapeHtml(person.biography) || 'Aucune biographie disponible.'}</div>
          </div>
        </div>
        <div style="margin-top: 40px;">
          <h3>Connu(e) pour</h3>
          <div class="grid" style="margin-top: 15px;">${cards}</div>
        </div>
      </div>
    `;

    const headHtml = head({
      title: `${person.name}`,
      description: `Informations et filmographie de ${person.name}`,
      url: `${SITE_URL}/person/${id}/${encodeURIComponent(correctSlug)}`,
      image: img(person.profile_path, 'w780'),
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(404).send(layout({
      headHtml: head({ title: 'Personne non trouvée', description: '', url: `${SITE_URL}/person/${id}` }),
      bodyHtml: `<div class="empty" style="padding: 40px; text-align: center; color: #fff;">Personne non trouvée.</div>`,
      activeTab: 'movie',
    }));
  }
});

// ---------- COUNTDOWN WATCH PAGE ----------
app.get('/watch/:id', async (req, res) => {
  const { id } = req.params;
  try {
    let data;
    try {
      data = await tmdb(`/movie/${id}`);
    } catch (err) {
      data = await tmdb(`/tv/${id}`);
    }
    const title = data.title || data.name || 'Vidéo';
    const targetUrl = 'https://moviegate.bolt.host/fr'; 

    const bodyHtml = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; color: #fff; text-align: center; font-family: sans-serif;">
        <h2>Préparation de votre lecteur pour : <span style="color: #e50914;">${escapeHtml(title)}</span></h2>
        <p style="font-size: 1.2rem; margin: 20px 0;">Veuillez patienter <span id="countdown" style="font-weight: bold; color: #e50914; font-size: 1.5rem;">5</span> secondes...</p>
        <div style="width: 200px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
          <div id="progress" style="width: 100%; height: 100%; background: #e50914; transition: width 1s linear;"></div>
        </div>
      </div>
      <script>
        let seconds = 5;
        const countdownEl = document.getElementById('countdown');
        const progressEl = document.getElementById('progress');
        
        const timer = setInterval(() => {
          seconds--;
          countdownEl.textContent = seconds;
          progressEl.style.width = (seconds / 5 * 100) + '%';
          
          if (seconds <= 0) {
            clearInterval(timer);
            window.location.href = "${targetUrl}";
          }
        }, 1000);
      </script>
    `;

    const headHtml = head({
      title: `Regarder ${title}`,
      description: `Regarder en ligne ${title}`,
      url: `${SITE_URL}/watch/${id}`,
      robots: 'noindex, nofollow',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.redirect('/');
  }
});

// ---------- SEARCH PAGE ----------
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  try {
    const data = await tmdb('/search/multi', { query });
    const results = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv' || r.media_type === 'person');
    
    const cards = results.map(item => {
      if (item.media_type === 'person') {
        const pSlug = slugify(item.name);
        return `
          <div class="poster-card" onclick="window.location.href='/person/${item.id}/${encodeURIComponent(pSlug)}'" style="cursor:pointer; background:#181818; border-radius:8px; overflow:hidden; text-align:center; padding-bottom:10px;">
            <img src="${img(item.profile_path, 'w185')}" alt="${escapeHtml(item.name)}" style="width:100%; height:250px; object-fit:cover;">
            <div style="padding:10px; color:#fff; font-weight:bold; font-size:0.9rem;">${escapeHtml(item.name)}</div>
            <div style="color:#aaa; font-size:0.8rem;">Acteur/Actrice</div>
          </div>
        `;
      }
      return posterCard(item, item.media_type);
    }).join('');
    
    const bodyHtml = `
      <div class="section-block" style="padding: 20px; color: #fff;">
        <h2>Résultats de recherche pour : "${escapeHtml(query)}"</h2>
        ${cards ? `<div class="grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:15px; margin-top:20px;">${cards}</div>` : '<div class="empty" style="padding: 40px; text-align: center;">Aucun résultat trouvé.</div>'}
      </div>
    `;

    const headHtml = head({
      title: `Recherche : ${query}`,
      description: `Résultats de la recherche pour ${query}`,
      url: `${SITE_URL}/search?q=${encodeURIComponent(query)}`,
      robots: 'noindex, nofollow',
    });

    res.send(layout({ headHtml, bodyHtml, activeTab: 'movie' }));
  } catch (e) {
    res.status(500).send(layout({
      headHtml: head({ title: 'Erreur', description: '', url: `${SITE_URL}/search` }),
      bodyHtml: `<div class="empty">Une erreur s'est produite lors de la recherche.</div>`,
      activeTab: 'movie',
    }));
  }
});

// ---------- API PROXY ----------
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.json({ results: [] });
    const data = await tmdb('/search/multi', { query: q });
    const results = data.results
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv' || r.media_type === 'person')
      .slice(0, 8)
      .map(r => ({
        id: r.id,
        type: r.media_type,
        title: r.title || r.name,
        year: (r.release_date || r.first_air_date || '').slice(0, 4),
        poster: img(r.poster_path || r.profile_path, 'w92'),
        slug: slugify(r.title || r.name),
      }));
    res.json({ results });
  } catch (e) {
    res.status(500).json({ results: [], error: true });
  }
});

app.get('/api/season/:tvId/:seasonNumber', async (req, res) => {
  try {
    const { tvId, seasonNumber } = req.params;
    const data = await tmdb(`/tv/${tvId}/season/${seasonNumber}`);
    const episodes = (data.episodes || []).map(ep => ({
      number: ep.episode_number,
      name: ep.name,
      airDate: ep.air_date,
      rating: ep.vote_average ? ep.vote_average.toFixed(1) : '-',
      overview: ep.overview,
      still: img(ep.still_path, 'w300'),
    }));
    res.json({ episodes });
  } catch (e) {
    res.status(500).json({ episodes: [], error: true });
  }
});

// ---------- SITEMAP & ROBOTS ----------
app.get('/sitemap.xml', async (req, res) => {
  try {
    const mp = await tmdb('/movie/popular');
    const today = new Date().toISOString().split('T')[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    // Halaman Utama Film & Serial
    xml += `  <url><loc>${SITE_URL}/movie</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
    xml += `  <url><loc>${SITE_URL}/tv</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
    
    // Halaman Detail Film Populer
    if (mp && mp.results) {
      mp.results.forEach(m => {
        const slug = slugify(m.title || 'film');
        xml += `  <url><loc>${SITE_URL}/movie/${m.id}/${slug}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
      });
    }
    
    xml += `</urlset>`;
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (e) {
    res.status(500).send('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
