const TMDB_API_KEY = '513182919ede525d4b5c8292e15b3c06'; // atau ambil dari process.env

async function tmdb(endpoint, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  url.searchParams.append('api_key', process.env.TMDB_API_KEY || TMDB_API_KEY);
  url.searchParams.append('language', 'fr-FR'); // <-- Pastikan ini ada agar judul & sinopsis jadi bahasa Prancis
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);
  return await res.json();
}

function img(path, size = 'w500') {
  if (!path) return 'https://via.placeholder.com/500x750?text=Aucune+Image';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function slugify(text) {
  if (!text) return 'item';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Menghilangkan aksen Prancis (opsional, agar URL bersih)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { tmdb, img, slugify };
