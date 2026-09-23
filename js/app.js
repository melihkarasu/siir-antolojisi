function safeCopyToClipboard(text, msg) {
  if (window.copyToClipboard) {
    window.copyToClipboard(text, msg);
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (window.showToast) window.showToast('✓ ' + (msg || 'Panoya kopyalandı!'));
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
    if (window.showToast) window.showToast('✓ ' + (msg || 'Panoya kopyalandı!'));
  } catch(e) {
    if (window.showToast) window.showToast('Kopyalama başarısız');
  }
  document.body.removeChild(ta);
}

let currentPoemData = null;

        async function loadRandomPoem() {
          const loading = document.getElementById('poem-loading');
          const card = document.getElementById('poem-content-card');
          const authorBox = document.getElementById('author-poems-container');

          loading.classList.remove('hidden');
          card.classList.add('hidden');
          authorBox.classList.add('hidden');

          try {
            const res = await fetch('/api/poetry/random');
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            currentPoemData = data;
            renderPoem(data);
          } catch(err) {
            loading.innerHTML = '<span class="text-rose-500 font-medium text-sm">Şiir yüklenemedi: ' + err.message + '</span>';
          }
        }

        async function searchAuthorPoems() {
          const author = (document.getElementById('search-author').value || '').trim();
          if (!author) return;

          const loading = document.getElementById('poem-loading');
          const card = document.getElementById('poem-content-card');
          const authorBox = document.getElementById('author-poems-container');

          loading.classList.remove('hidden');
          card.classList.add('hidden');
          authorBox.classList.add('hidden');

          try {
            const res = await fetch(`/api/poetry/search?author=${encodeURIComponent(author)}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            const poems = data.poems || [];
            if (poems.length === 0) {
              loading.innerHTML = '<span class="text-mistral-stone font-medium text-sm">Bu şaire ait şiir bulunamadı.</span>';
              return;
            }

            // İlk şiiri ana ekranda aç
            renderPoem(poems[0]);

            // Diğerlerini listele
            if (poems.length > 1) {
              const grid = document.getElementById('author-poems-grid');
              grid.innerHTML = poems.slice(1).map((p, idx) => `
                <div onclick='renderPoem(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="p-4 rounded-xl bg-white border border-mistral-hairline hover:border-mistral-orange/40 hover:shadow-sm cursor-pointer transition flex flex-col justify-between group">
                  <div>
                    <h4 class="font-bold text-sm font-editorial text-mistral-ink group-hover:text-mistral-orange transition truncate mb-1">${p.title}</h4>
                    <span class="text-xs text-mistral-slate block mb-2">${p.author}</span>
                  </div>
                  <div class="pt-2 border-t border-mistral-hairline flex items-center justify-between text-[11px] text-mistral-stone font-mono">
                    <span>${p.linecount || p.lines?.length || '-'} dize</span>
                    <span class="text-mistral-orange font-bold font-sans">Oku &rarr;</span>
                  </div>
                </div>
              `).join('');
              authorBox.classList.remove('hidden');
            }
          } catch(err) {
            loading.innerHTML = '<span class="text-rose-500 font-medium text-sm">Şair sorgulanamadı: ' + err.message + '</span>';
          }
        }

        function quickAuthor(author) {
          document.getElementById('search-author').value = author;
          searchAuthorPoems();
        }

        function renderPoem(p) {
          currentPoemData = p;
          const loading = document.getElementById('poem-loading');
          const card = document.getElementById('poem-content-card');

          loading.classList.add('hidden');
          card.classList.remove('hidden');

          document.getElementById('poem-title').innerText = p.title;
          document.getElementById('poem-author').innerText = '✍️ ' + p.author;
          document.getElementById('poem-lines-count').innerText = (p.linecount || p.lines?.length || 0) + ' Dize';

          const linesBox = document.getElementById('poem-lines');
          const lines = p.lines || [];
          linesBox.innerHTML = lines.map(line => {
            if (line.trim() === '') return '<div class="h-4"></div>';
            return `<p class="leading-relaxed">${line}</p>`;
          }).join('');

          window.scrollTo({ top: 120, behavior: 'smooth' });
        }

        function copyPoemText() {
          if (!currentPoemData) return;
          const txt = currentPoemData.title + ' - ' + currentPoemData.author + '\\n\\n' + (currentPoemData.lines || []).join('\\n');
          navigator.clipboard.writeText(txt);
          alert('✓ Şiir panoya kopyalandı!');
        }

        function savePoemToFavorites() {
          if (!currentPoemData) return;
          let favs = JSON.parse(localStorage.getItem('vibe_fav_poems') || '[]');
          if (!favs.some(x => x.title === currentPoemData.title)) {
            favs.unshift({ title: currentPoemData.title, author: currentPoemData.author, date: new Date().toLocaleDateString('tr-TR') });
            localStorage.setItem('vibe_fav_poems', JSON.stringify(favs));
            alert(`"✓ ${currentPoemData.title}" antolojinize kaydedildi!`);
          } else {
            alert('Bu şiir zaten antolojinizde kayıtlı.');
          }
        }

        document.addEventListener('DOMContentLoaded', loadRandomPoem);
