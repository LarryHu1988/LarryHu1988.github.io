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
const githubProjectsNode = document.getElementById('github-projects');

const GITHUB_USERNAME = 'LarryHu1988';
const PROJECT_FALLBACK = [
  {
    name: 'Matchday',
    description: 'Minimal football info iOS app built with SwiftUI.',
    html_url: 'https://github.com/LarryHu1988/Matchday',
    language: 'Swift',
    stargazers_count: 1,
    updated_at: '2026-02-01T00:00:00Z'
  },
  {
    name: 'PDFLibrarian',
    description: 'PDF metadata lookup, Dublin Core writing and rule-based renaming for macOS.',
    html_url: 'https://github.com/LarryHu1988/PDFLibrarian',
    language: 'Swift',
    stargazers_count: 1,
    updated_at: '2026-01-15T00:00:00Z'
  }
];

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractPreview(content) {
  const lines = normalizeText(content)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return '';
  }

  return lines.slice(0, 2).join(' / ');
}

function createPoemCard(poem) {
  const title = normalizeText(poem.title);
  const author = normalizeText(poem.author);
  const content = normalizeText(poem.content);
  const writtenAt = normalizeText(poem.writtenAt);

  if (!title || !author || !content) {
    return null;
  }

  const card = document.createElement('details');
  card.className = 'poem-card';

  const summary = document.createElement('summary');
  summary.className = 'poem-summary';

  const top = document.createElement('span');
  top.className = 'poem-summary-top';

  const titleNode = document.createElement('span');
  titleNode.className = 'poem-title';
  titleNode.textContent = `《${title}》`;

  const actionNode = document.createElement('span');
  actionNode.className = 'poem-action';
  actionNode.textContent = '展开';

  top.append(titleNode, actionNode);

  const authorNode = document.createElement('span');
  authorNode.className = 'poem-author';
  authorNode.textContent = writtenAt ? `${author} · ${writtenAt}` : author;

  const previewNode = document.createElement('span');
  previewNode.className = 'poem-preview';
  previewNode.textContent = extractPreview(content);

  summary.append(top, authorNode, previewNode);

  const detail = document.createElement('div');
  detail.className = 'poem-detail';

  const bodyNode = document.createElement('pre');
  bodyNode.className = 'poem-body';
  bodyNode.textContent = content;

  detail.append(bodyNode);
  card.append(summary, detail);

  card.addEventListener('toggle', () => {
    actionNode.textContent = card.open ? '收起' : '展开';
  });

  return card;
}

function renderPoetryLibrary(poems) {
  if (!poetryLibraryNode) {
    return;
  }

  poetryLibraryNode.innerHTML = '';

  const cards = poems
    .map((poem) => createPoemCard(poem))
    .filter((card) => card !== null);

  if (cards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'poem-author';
    empty.textContent = '诗歌暂未公开。';
    poetryLibraryNode.append(empty);
    return;
  }

  cards.forEach((card) => {
    poetryLibraryNode.append(card);

    card.addEventListener('toggle', () => {
      if (!card.open) {
        return;
      }

      cards.forEach((otherCard) => {
        if (otherCard !== card) {
          otherCard.open = false;
        }
      });
    });
  });
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

      quotePool.push({ text, source: `《${title}》 · ${author}` });
    });
  });

  return quotePool;
}

function paintHeroQuote(quote, animate = true) {
  if (!heroPoemTextNode || !heroPoemSourceNode) {
    return;
  }

  if (!animate) {
    heroPoemTextNode.textContent = `“${quote.text}”`;
    heroPoemSourceNode.textContent = quote.source;
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
    heroPoemTextNode.textContent = '“诗歌正在生长。”';
    heroPoemSourceNode.textContent = '龙雨';
    return;
  }

  let quoteIndex = getDailyStartIndex(quotePool.length);
  paintHeroQuote(quotePool[quoteIndex], false);

  if (quotePool.length === 1) {
    return;
  }

  window.setInterval(() => {
    if (document.hidden) {
      return;
    }

    quoteIndex = (quoteIndex + 1) % quotePool.length;
    paintHeroQuote(quotePool[quoteIndex], true);
  }, 12000);
}

function formatDate(isoTime) {
  if (!isoTime) {
    return '';
  }

  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function createProjectCard(project) {
  const card = document.createElement('article');
  card.className = 'project-card';

  const title = document.createElement('h3');
  title.className = 'project-title';

  const titleLink = document.createElement('a');
  titleLink.href = project.html_url;
  titleLink.target = '_blank';
  titleLink.rel = 'noreferrer';
  titleLink.textContent = project.name;
  title.append(titleLink);

  const desc = document.createElement('p');
  desc.className = 'project-desc';
  desc.textContent = normalizeText(project.description) || '暂无项目描述。';

  const meta = document.createElement('div');
  meta.className = 'project-meta';

  if (project.language) {
    const lang = document.createElement('span');
    lang.textContent = project.language;
    meta.append(lang);
  }

  const stars = document.createElement('span');
  stars.textContent = `★ ${project.stargazers_count || 0}`;
  meta.append(stars);

  const updated = formatDate(project.updated_at);
  if (updated) {
    const date = document.createElement('span');
    date.textContent = `更新 ${updated}`;
    meta.append(date);
  }

  const link = document.createElement('a');
  link.className = 'project-link';
  link.href = project.html_url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = '查看仓库';

  card.append(title, desc, meta, link);
  return card;
}

function renderGitHubProjects(projects) {
  if (!githubProjectsNode) {
    return;
  }

  githubProjectsNode.innerHTML = '';

  if (!Array.isArray(projects) || projects.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'project-empty';
    empty.textContent = '暂时没有可展示的项目。';
    githubProjectsNode.append(empty);
    return;
  }

  projects.forEach((project) => githubProjectsNode.append(createProjectCard(project)));
}

async function loadGitHubProjects() {
  if (!githubProjectsNode) {
    return;
  }

  try {
    const response = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );

    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`);
    }

    const repos = await response.json();
    const projects = repos
      .filter((repo) => !repo.fork)
      .filter((repo) => repo.name !== `${GITHUB_USERNAME}.github.io`)
      .slice(0, 6);

    renderGitHubProjects(projects.length > 0 ? projects : PROJECT_FALLBACK);
  } catch (error) {
    renderGitHubProjects(PROJECT_FALLBACK);
  }
}

renderPoetryLibrary(poemLibrary);
startHeroQuoteRotation(poemLibrary);
loadGitHubProjects();
