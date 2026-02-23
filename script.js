const menuBtn = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  document.addEventListener('click', (event) => {
    const clickInsideMenu = navLinks.contains(event.target);
    const clickMenuBtn = menuBtn.contains(event.target);
    if (!clickInsideMenu && !clickMenuBtn) {
      navLinks.classList.remove('open');
    }
  });
}

const yearNode = document.getElementById('year');
if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

const revealItems = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => observer.observe(item));

const poemLibrary = Array.isArray(window.POEM_LIBRARY) ? window.POEM_LIBRARY : [];
const poetryLibraryNode = document.getElementById('poetry-library');
const heroPoemTextNode = document.getElementById('hero-poem-text');
const heroPoemSourceNode = document.getElementById('hero-poem-source');

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createPoemEntry(poem) {
  const title = normalizeText(poem.title);
  const author = normalizeText(poem.author);
  const content = normalizeText(poem.content);
  const writtenAt = normalizeText(poem.writtenAt);

  if (!title || !author || !content) {
    return null;
  }

  const entry = document.createElement('section');
  entry.className = 'poem-entry';

  const titleNode = document.createElement('h3');
  titleNode.className = 'poem-title';
  titleNode.textContent = `《${title}》`;

  const authorNode = document.createElement('p');
  authorNode.className = 'poem-author';
  authorNode.textContent = writtenAt ? `${author} · ${writtenAt}` : author;

  const bodyNode = document.createElement('pre');
  bodyNode.className = 'poem-body';
  bodyNode.textContent = content;

  entry.append(titleNode, authorNode, bodyNode);
  return entry;
}

function renderPoetryLibrary(poems) {
  if (!poetryLibraryNode) {
    return;
  }

  poetryLibraryNode.innerHTML = '';

  const entries = poems
    .map((poem) => createPoemEntry(poem))
    .filter((entry) => entry !== null);

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'poem-author';
    empty.textContent = '诗歌库为空，请在 poems.js 中新增作品。';
    poetryLibraryNode.append(empty);
    return;
  }

  entries.forEach((entry) => poetryLibraryNode.append(entry));
}

function buildQuotePool(poems) {
  const quotePool = [];

  poems.forEach((poem) => {
    const title = normalizeText(poem.title);
    const author = normalizeText(poem.author);
    const quotes = Array.isArray(poem.quotes) ? poem.quotes : [];

    if (!title || !author) {
      return;
    }

    quotes.forEach((quote) => {
      const text = normalizeText(quote);
      if (!text) {
        return;
      }

      quotePool.push({
        text,
        source: `《${title}》 · ${author}`
      });
    });
  });

  return quotePool;
}

function paintHeroQuote(quote) {
  if (!heroPoemTextNode || !heroPoemSourceNode) {
    return;
  }

  heroPoemTextNode.classList.add('is-switching');
  heroPoemSourceNode.classList.add('is-switching');

  window.setTimeout(() => {
    heroPoemTextNode.textContent = `“${quote.text}”`;
    heroPoemSourceNode.textContent = quote.source;
    heroPoemTextNode.classList.remove('is-switching');
    heroPoemSourceNode.classList.remove('is-switching');
  }, 160);
}

function getDailyStartIndex(length) {
  const now = new Date();
  const dayKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return dayKey % length;
}

function startHeroQuoteRotation(poems) {
  if (!heroPoemTextNode || !heroPoemSourceNode) {
    return;
  }

  const quotePool = buildQuotePool(poems);
  if (quotePool.length === 0) {
    heroPoemTextNode.textContent = '“请在 poems.js 中设置 quotes 字段。”';
    heroPoemSourceNode.textContent = '诗歌库自动轮换';
    return;
  }

  let quoteIndex = getDailyStartIndex(quotePool.length);
  paintHeroQuote(quotePool[quoteIndex]);

  if (quotePool.length === 1) {
    return;
  }

  window.setInterval(() => {
    if (document.hidden) {
      return;
    }

    quoteIndex = (quoteIndex + 1) % quotePool.length;
    paintHeroQuote(quotePool[quoteIndex]);
  }, 12000);
}

renderPoetryLibrary(poemLibrary);
startHeroQuoteRotation(poemLibrary);
