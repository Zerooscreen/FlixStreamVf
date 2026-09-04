const SITE_NAME = 'FlixStreamVf';
const DEFAULT_TITLE = 'FlixStreamVf - Voir Films en HD et Séries en Streaming Français Complet';
const DEFAULT_DESC = 'Profitez de films et séries TV en streaming français complet sur CinéflixHD. Accédez gratuitement à un vaste catalogue de contenus en haute définition.';

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function head({ title = DEFAULT_TITLE, description = DEFAULT_DESC, url = '', image = '', robots = 'index, follow', type = 'website' }) {
  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="${robots}">
    
    <!-- Google Search Console Verification -->
    <meta name="google-site-verification" content="M-_SCpf4h0A8JcaYgk3_kEfeagIFV6cKmqsg0iROtiI" />

    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    ${url ? `<meta property="og:url" content="${url}">` : ''}
    ${image ? `<meta property="og:image" content="${image}">` : ''}
    <meta property="og:type" content="${type}">
    <meta property="og:site_name" content="${SITE_NAME}">
    <link rel="stylesheet" href="/style.css">

    <!-- Monetag & Adsterra Scripts -->
    <script>(function(s){s.dataset.zone='11565675',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
    <script>(function(s){s.dataset.zone='11565740',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
    <script src="https://pl30557735.effectivecpmnetwork.com/51/65/ed/5165ed7649b06fc95e9d3bbc1839dcd9.js"></script>
    <script src="https://pl30557736.effectivecpmnetwork.com/af/c1/6d/afc16d8a70f1f493abf2098939fca8f7.js"></script>
  `;
}

function layout({ headHtml, bodyHtml, activeTab }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  ${headHtml}
</head>
<body>
  <!-- Histats Hidden Counter -->
  <div id="histats_counter" style="display:none;"></div>
  <script type="text/javascript">var _Hasync= _Hasync|| [];
  _Hasync.push(['Histats.start', '1,5014113,4,1,120,40,00011111']);
  _Hasync.push(['Histats.fasi', '1']);
  _Hasync.push(['Histats.track_hits', '']);
  (function() {
  var hs = document.createElement('script'); hs.type = 'text/javascript'; hs.async = true;
  hs.src = ('//s10.histats.com/js15_as.js');
  (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
  })();</script>
  <noscript><a href="/" target="_blank"><img src="//sstatic1.histats.com/0.gif?5014113&101" alt="" border="0"></a></noscript>

  <header id="header">
    <div class="header-content">
      <a href="/" class="logo">Flix<span>Stream</span>Vf</span></a>
      <nav class="nav-links">
        <a href="/movie" class="${activeTab === 'movie' ? 'active' : ''}">Films</a>
        <a href="/tv" class="${activeTab === 'tv' ? 'active' : ''}">Séries</a>
      </nav>
      <div class="search-box">
        <input type="text" id="search-input" placeholder="Rechercher films, séries..." autocomplete="off">
        <div id="search-results" class="search-dropdown"></div>
      </div>
    </div>
  </header>
  
  <div style="text-align:center; margin: 10px 0;">
    <script>
      atOptions = {
        'key' : '9eab15e2d0d97de74e3ee971fe615a5e',
        'format' : 'iframe',
        'height' : 90,
        'width' : 728,
        'params' : {}
      };
    </script>
    <script src="https://www.highperformanceformat.com/9eab15e2d0d97de74e3ee971fe615a5e/invoke.js"></script>
  </div>

  <main id="main">
    ${bodyHtml}
  </main>

  <footer id="footer">
    <p>&copy; ${new Date().getFullYear()} FlixStreamVf. Tous droits réservés.</p>
  </footer>

  <script src="/app.js"></script>
</body>
</html>`;
}

function posterCard(item, kind) {
  const title = item.title || item.name || '';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '-';
  const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : 'https://via.placeholder.com/342x513?text=Aucune+Image';
  const urlKind = kind === 'tv' ? 'tv' : 'movie';
  const slug = item.slug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : 'item');

  return `
    <div class="poster-card" onclick="window.location.href='/${urlKind}/${item.id}/${encodeURIComponent(slug)}'">
      <div class="poster-img-wrap">
        <img src="${posterPath}" alt="${escapeHtml(title)}" loading="lazy">
        <div class="poster-rating">★ ${rating}</div>
      </div>
      <div class="poster-title">${escapeHtml(title)}</div>
      <div class="poster-year">${year}</div>
    </div>
  `;
}

function genreRow(genres) {
  if (!genres || !genres.length) return '';
  return `<div class="detail-genres">${genres.map(g => `<span class="genre-tag">${escapeHtml(g.name)}</span>`).join('')}</div>`;
}

function trailerBlock(videos) {
  if (!videos || !videos.results) return '<p>Bande-annonce indisponible.</p>';
  const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  if (!trailer) return '<p>Bande-annonce indisponible.</p>';
  return `
    <div class="video-container">
      <iframe src="https://www.youtube.com/embed/${trailer.key}" title="Bande-annonce" frameborder="0" allowfullscreen></iframe>
    </div>
  `;
}

function castGrid(credits) {
  if (!credits || !credits.cast || !credits.cast.length) return '<p>Casting indisponible.</p>';
  const cast = credits.cast.slice(0, 6);
  return `
    <div class="cast-grid">
      ${cast.map(c => `
        <div class="cast-card" onclick="window.location.href='/person/${c.id}/${encodeURIComponent(c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}'" style="cursor:pointer;">
          <img src="${c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://via.placeholder.com/185x278?text=Aucune+Photo'}" alt="${escapeHtml(c.name)}" loading="lazy">
          <div class="cast-name">${escapeHtml(c.name)}</div>
          <div class="cast-character">${escapeHtml(c.character || '')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function similarSection(similar) {
  if (!similar || !similar.results || !similar.results.length) return '';
  const cards = similar.results.slice(0, 6).map(item => posterCard(item, item.media_type || 'movie')).join('');
  return `
    <div class="section-block">
      <h3>Titres Similaires</h3>
      <div class="grid">${cards}</div>
    </div>
  `;
}

function nativeBannerAd() {
  return `
    <div style="text-align:center; margin: 20px 0;">
      <script async="async" data-cfasync="false" src="https://pl30557737.effectivecpmnetwork.com/6f7b03feb080b4884047d6210ed8268e/invoke.js"></script>
      <div id="container-6f7b03feb080b4884047d6210ed8268e"></div>
    </div>
  `;
}

function sideBannerAd() {
  return `
    <div style="text-align:center; margin: 20px 0;">
      <script>
        atOptions = {
          'key' : 'b4c5edd71dd22f2f3a51a8206816e9ac',
          'format' : 'iframe',
          'height' : 60,
          'width' : 468,
          'params' : {}
        };
      </script>
      <script src="https://www.highperformanceformat.com/b4c5edd71dd22f2f3a51a8206816e9ac/invoke.js"></script>
    </div>
  `;
}

function movieJsonLd(data, url) {
  const json = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": data.title,
    "description": data.overview,
    "image": data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
    "datePublished": data.release_date,
    "url": url
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

function tvJsonLd(data, url) {
  const json = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": data.name,
    "description": data.overview,
    "image": data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
    "datePublished": data.first_air_date,
    "url": url
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

module.exports = {
  head,
  layout,
  posterCard,
  genreRow,
  trailerBlock,
  castGrid,
  escapeHtml,
  movieJsonLd,
  tvJsonLd,
  nativeBannerAd,
  sideBannerAd,
  similarSection,
  DEFAULT_TITLE,
  DEFAULT_DESC,
  SITE_NAME
};
