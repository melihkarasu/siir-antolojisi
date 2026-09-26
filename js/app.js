// Güvenli panoya kopyalama (HTTPS/HTTP hibrit)
function safeCopyToClipboard(text, msg) {
  if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✓ ' + (msg || 'Panoya kopyalandı!'));
    }).catch(() => fallbackExecCopy(text, msg));
  } else {
    fallbackExecCopy(text, msg);
  }
}

function fallbackExecCopy(text, msg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('✓ ' + (msg || 'Panoya kopyalandı!'));
  } catch(e) {
    showToast('Kopyalama başarısız');
  }
  document.body.removeChild(ta);
}

// Toast bildirimi
function showToast(msg) {
  let toast = document.getElementById('siir-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siir-toast';
    toast.className = 'fixed bottom-6 right-6 py-2.5 px-4 rounded-xl bg-mistral-ink text-white font-semibold text-xs shadow-2xl transition z-50';
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

let currentPoemData = null;
let currentAuthorPoems = []; // İndeks-tabanlı güvenli bağlama için

// Yükleme göstergesi orijinal içerik
const LOADING_HTML = '<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-mistral-cream text-mistral-ink border border-mistral-beige-deep text-xs font-semibold"><span class="w-2.5 h-2.5 rounded-full bg-mistral-orange animate-ping"></span><span>Dizeler antolojiden derleniyor...</span></div>';

// ===== PoetryDB doğrudan API (CORS-open, backend proxy yok) =====
async function loadRandomPoem() {
  const loading = document.getElementById('poem-loading');
  const card = document.getElementById('poem-content-card');
  const authorBox = document.getElementById('author-poems-container');

  loading.innerHTML = LOADING_HTML;
  loading.classList.remove('hidden');
  card.classList.add('hidden');
  authorBox.classList.add('hidden');

  try {
    const res = await fetch('https://poetrydb.org/random/1');
    if (!res.ok) throw new Error('PoetryDB yanıt vermedi (HTTP ' + res.status + ')');
    const data = await res.json();
    const poem = (data && data[0]) || {};

    currentPoemData = {
      title: poem.title || 'İsimsiz Şiir',
      author: poem.author || 'Anonim',
      lines: poem.lines || [],
      linecount: poem.linecount || (poem.lines ? poem.lines.length : 0)
    };
    renderPoem(currentPoemData);
  } catch(err) {
    console.error('loadRandomPoem error:', err);
    loading.innerHTML = '<span class="text-rose-500 font-medium text-sm">Şiir yüklenemedi: ' + err.message + '</span>';
  }
}

async function searchAuthorPoems() {
  const author = (document.getElementById('search-author').value || '').trim();
  if (!author) return;

  const loading = document.getElementById('poem-loading');
  const card = document.getElementById('poem-content-card');
  const authorBox = document.getElementById('author-poems-container');

  loading.innerHTML = LOADING_HTML;
  loading.classList.remove('hidden');
  card.classList.add('hidden');
  authorBox.classList.add('hidden');

  try {
    // PoetryDB author endpoint (CORS-open)
    const res = await fetch('https://poetrydb.org/author/' + encodeURIComponent(author));
    if (!res.ok) throw new Error('Şair şiirleri bulunamadı (HTTP ' + res.status + ')');
    const data = await res.json();

    // PoetryDB bulunamadığında {status: 404, reason: ...} döner
    if (data && data.status === 404) {
      loading.innerHTML = '<span class="text-mistral-stone font-medium text-sm">Bu şaire ait şiir bulunamadı.</span>';
      return;
    }

    const poems = (Array.isArray(data) ? data : []).slice(0, 15);
    if (poems.length === 0) {
      loading.innerHTML = '<span class="text-mistral-stone font-medium text-sm">Bu şaire ait şiir bulunamadı.</span>';
      return;
    }

    // İndeks-tabanlı dizi (apostroflu başlıklar HTML kıramaz)
    currentAuthorPoems = poems.map(p => ({
      title: p.title || 'İsimsiz Şiir',
      author: p.author || author,
      lines: p.lines || [],
      linecount: p.linecount || (p.lines ? p.lines.length : 0)
    }));

    // İlk şiiri ana ekranda aç
    renderPoem(currentAuthorPoems[0]);

    // Diğerlerini listele
    if (currentAuthorPoems.length > 1) {
      const grid = document.getElementById('author-poems-grid');
      grid.innerHTML = currentAuthorPoems.slice(1).map((p, idx) => `
        <div onclick="renderPoemByIdx(${idx + 1})" class="p-4 rounded-xl bg-white border border-mistral-hairline hover:border-mistral-orange/40 hover:shadow-sm cursor-pointer transition flex flex-col justify-between group">
          <div>
            <h4 class="font-bold text-sm font-editorial text-mistral-ink group-hover:text-mistral-orange transition truncate mb-1">${p.title}</h4>
            <span class="text-xs font-semibold text-mistral-slate block mb-2">${p.author}</span>
          </div>
          <div class="pt-2 border-t border-mistral-hairline flex items-center justify-between text-[11px] text-mistral-stone font-mono">
            <span>${p.linecount || '-'} dize</span>
            <span class="text-mistral-orange font-bold font-sans">Oku &rarr;</span>
          </div>
        </div>
      `).join('');
      authorBox.classList.remove('hidden');
    }
  } catch(err) {
    console.error('searchAuthorPoems error:', err);
    loading.innerHTML = '<span class="text-rose-500 font-medium text-sm">Şair sorgulanamadı: ' + err.message + '</span>';
  }
}

function quickAuthor(author) {
  document.getElementById('search-author').value = author;
  searchAuthorPoems();
}

function renderPoemByIdx(idx) {
  const p = currentAuthorPoems[idx];
  if (p) renderPoem(p);
}

function renderPoem(p) {
  currentPoemData = p;
  const loading = document.getElementById('poem-loading');
  const card = document.getElementById('poem-content-card');

  loading.classList.add('hidden');
  card.classList.remove('hidden');

  document.getElementById('poem-title').innerText = p.title;
  document.getElementById('poem-author').innerText = '✍️ ' + p.author;
  document.getElementById('poem-lines-count').innerText = (p.linecount || p.lines.length || 0) + ' Dize';

  const linesBox = document.getElementById('poem-lines');
  const lines = p.lines || [];
  linesBox.innerHTML = lines.map(line => {
    if (line.trim() === '') return '<div class="h-4"></div>';
    return '<p class="leading-relaxed">' + escapeHtml(line) + '</p>';
  }).join('');

  window.scrollTo({ top: 120, behavior: 'smooth' });
}

// XSS güvenli HTML kaçışı (şiir satırları için)
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function copyPoemText() {
  if (!currentPoemData) return;
  const txt = currentPoemData.title + ' - ' + currentPoemData.author + '\n\n' + (currentPoemData.lines || []).join('\n');
  safeCopyToClipboard(txt, 'Şiir panoya kopyalandı!');
}

function savePoemToFavorites() {
  if (!currentPoemData) return;
  let favs = [];
  try {
    favs = JSON.parse(localStorage.getItem('siir_antolojim') || '[]');
    if (!Array.isArray(favs)) favs = [];
  } catch(e) { favs = []; }

  if (!favs.some(x => x.title === currentPoemData.title)) {
    favs.unshift({ title: currentPoemData.title, author: currentPoemData.author, date: new Date().toLocaleDateString('tr-TR') });
    localStorage.setItem('siir_antolojim', JSON.stringify(favs));
    showToast('✓ "' + currentPoemData.title + '" antolojinize kaydedildi!');
  } else {
    showToast('Bu şiir zaten antolojinizde kayıtlı.');
  }
}

document.addEventListener('DOMContentLoaded', loadRandomPoem);

// Window globals for inline onclicks
window.loadRandomPoem = loadRandomPoem;
window.searchAuthorPoems = searchAuthorPoems;
window.quickAuthor = quickAuthor;
window.renderPoemByIdx = renderPoemByIdx;
window.copyPoemText = copyPoemText;
window.savePoemToFavorites = savePoemToFavorites;
