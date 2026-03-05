const menuBtn = document.querySelector('.menu-toggle')
const navLinks = document.querySelector('.nav-links')

if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open')
  })

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('open'))
  })

  document.addEventListener('click', (event) => {
    const clickInsideMenu = navLinks.contains(event.target)
    const clickMenuBtn = menuBtn.contains(event.target)

    if (!clickInsideMenu && !clickMenuBtn) {
      navLinks.classList.remove('open')
    }
  })
}

const yearNode = document.getElementById('year')
if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear())
}

const revealItems = document.querySelectorAll('.reveal')
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
      }
    })
  },
  { threshold: 0.16 }
)

revealItems.forEach((item) => observer.observe(item))

const poemLibraryRaw = Array.isArray(window.POEM_LIBRARY) ? window.POEM_LIBRARY : []
const poetryLibraryNode = document.getElementById('poetry-library')
const heroPoemTextNode = document.getElementById('hero-poem-text')
const heroPoemSourceNode = document.getElementById('hero-poem-source')
const poemModalNode = document.getElementById('poem-modal')
const poemModalBackdropNode = document.getElementById('poem-modal-backdrop')
const poemModalCloseNode = document.getElementById('poem-modal-close')
const poemModalTitleNode = document.getElementById('poem-modal-title')
const poemModalMetaNode = document.getElementById('poem-modal-meta')
const poemModalBodyNode = document.getElementById('poem-modal-body')
const githubProjectsNode = document.getElementById('github-projects')

const GITHUB_USERNAME = 'LarryHu1988'
const POEM_COVER_THEMES = ['theme-a', 'theme-b', 'theme-c', 'theme-d']
const SPORTS_TARGETS = [
  {
    containerId: 'barca-schedule',
    league: 'esp.1',
    teamId: '83',
    fallback: '巴萨赛程加载失败，请稍后刷新。'
  },
  {
    containerId: 'messi-schedule',
    league: 'usa.1',
    teamId: '20232',
    fallback: '梅西赛程加载失败，请稍后刷新。'
  }
]

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
]

let normalizedPoems = []

function accentRainCharacters(rootNode) {
  if (!rootNode) {
    return
  }

  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.includes('雨')) {
          return NodeFilter.FILTER_REJECT
        }

        const parent = node.parentNode
        if (!parent) {
          return NodeFilter.FILTER_REJECT
        }

        if (parent.nodeType === Node.ELEMENT_NODE && parent.classList.contains('rain-char')) {
          return NodeFilter.FILTER_REJECT
        }

        const tagName = parent.nodeName
        if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT
        }

        return NodeFilter.FILTER_ACCEPT
      }
    },
    false
  )

  const textNodes = []
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode)
  }

  textNodes.forEach((node) => {
    const content = node.nodeValue
    if (!content || !content.includes('雨')) {
      return
    }

    const parts = content.split('雨')
    const fragment = document.createDocumentFragment()

    parts.forEach((part, index) => {
      if (part.length > 0) {
        fragment.append(document.createTextNode(part))
      }

      if (index < parts.length - 1) {
        const marker = document.createElement('span')
        marker.className = 'rain-char'
        marker.textContent = '雨'
        fragment.append(marker)
      }
    })

    if (node.parentNode) {
      node.parentNode.replaceChild(fragment, node)
    }
  })
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePoem(poem) {
  const title = normalizeText(poem.title)
  const author = normalizeText(poem.author)
  const content = normalizeText(poem.content)
  const writtenAt = normalizeText(poem.writtenAt)
  const quotes = Array.isArray(poem.quotes)
    ? poem.quotes.map((quote) => normalizeText(quote)).filter((quote) => quote.length > 0)
    : []

  if (!title || !author || !content) {
    return null
  }

  return { title, author, content, writtenAt, quotes }
}

function extractPreview(content) {
  const lines = normalizeText(content)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return ''
  }

  return lines.slice(0, 2).join(' / ')
}

function getPoemMeta(poem) {
  return poem.writtenAt ? `${poem.author} · ${poem.writtenAt}` : poem.author
}

function createPoemCover(poem, index) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `poem-cover ${POEM_COVER_THEMES[index % POEM_COVER_THEMES.length]}`
  button.dataset.poemIndex = String(index)
  button.setAttribute('aria-label', `打开诗歌《${poem.title}》`)

  const inner = document.createElement('div')
  inner.className = 'poem-cover-inner'

  const titleNode = document.createElement('h3')
  titleNode.className = 'poem-cover-title'
  titleNode.textContent = `《${poem.title}》`

  const metaNode = document.createElement('p')
  metaNode.className = 'poem-cover-meta'
  metaNode.textContent = getPoemMeta(poem)

  const previewNode = document.createElement('p')
  previewNode.className = 'poem-cover-preview'
  previewNode.textContent = poem.quotes[0] || extractPreview(poem.content)

  inner.append(titleNode, metaNode, previewNode)
  button.append(inner)

  return button
}

function renderPoetryLibrary(poems) {
  if (!poetryLibraryNode) {
    return
  }

  poetryLibraryNode.innerHTML = ''

  if (poems.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'project-empty'
    empty.textContent = '诗歌暂未公开。'
    poetryLibraryNode.append(empty)
    return
  }

  poems.forEach((poem, index) => {
    poetryLibraryNode.append(createPoemCover(poem, index))
  })

  accentRainCharacters(poetryLibraryNode)
}

function openPoemModal(index) {
  if (!poemModalNode || !poemModalTitleNode || !poemModalMetaNode || !poemModalBodyNode) {
    return
  }

  const poem = normalizedPoems[index]
  if (!poem) {
    return
  }

  poemModalTitleNode.textContent = `《${poem.title}》`
  poemModalMetaNode.textContent = getPoemMeta(poem)
  poemModalBodyNode.textContent = poem.content
  accentRainCharacters(poemModalTitleNode)
  accentRainCharacters(poemModalMetaNode)
  accentRainCharacters(poemModalBodyNode)

  poemModalNode.classList.add('open')
  poemModalNode.setAttribute('aria-hidden', 'false')
  document.body.classList.add('modal-open')
}

function closePoemModal() {
  if (!poemModalNode) {
    return
  }

  poemModalNode.classList.remove('open')
  poemModalNode.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('modal-open')
}

function bindPoemModalEvents() {
  if (poetryLibraryNode) {
    poetryLibraryNode.addEventListener('click', (event) => {
      const cover = event.target.closest('.poem-cover')
      if (!cover) {
        return
      }

      const index = Number.parseInt(cover.dataset.poemIndex || '', 10)
      if (Number.isNaN(index)) {
        return
      }

      openPoemModal(index)
    })
  }

  if (poemModalBackdropNode) {
    poemModalBackdropNode.addEventListener('click', closePoemModal)
  }

  if (poemModalCloseNode) {
    poemModalCloseNode.addEventListener('click', closePoemModal)
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePoemModal()
    }
  })
}

function buildQuotePool(poems) {
  const quotePool = []

  poems.forEach((poem) => {
    poem.quotes.forEach((quote) => {
      quotePool.push({ text: quote, source: `《${poem.title}》 · ${poem.author}` })
    })
  })

  return quotePool
}

function paintHeroQuote(quote, animate = true) {
  if (!heroPoemTextNode || !heroPoemSourceNode) {
    return
  }

  if (!animate) {
    heroPoemTextNode.textContent = `“${quote.text}”`
    heroPoemSourceNode.textContent = quote.source
    accentRainCharacters(heroPoemTextNode)
    accentRainCharacters(heroPoemSourceNode)
    return
  }

  heroPoemTextNode.classList.add('is-switching')
  heroPoemSourceNode.classList.add('is-switching')

  window.setTimeout(() => {
    heroPoemTextNode.textContent = `“${quote.text}”`
    heroPoemSourceNode.textContent = quote.source
    accentRainCharacters(heroPoemTextNode)
    accentRainCharacters(heroPoemSourceNode)
    heroPoemTextNode.classList.remove('is-switching')
    heroPoemSourceNode.classList.remove('is-switching')
  }, 160)
}

function getDailyStartIndex(length) {
  const now = new Date()
  const dayKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  return dayKey % length
}

function startHeroQuoteRotation(poems) {
  if (!heroPoemTextNode || !heroPoemSourceNode) {
    return
  }

  const quotePool = buildQuotePool(poems)

  if (quotePool.length === 0) {
    heroPoemTextNode.textContent = '“诗歌正在生长。”'
    heroPoemSourceNode.textContent = '龙雨'
    accentRainCharacters(heroPoemTextNode)
    accentRainCharacters(heroPoemSourceNode)
    return
  }

  let quoteIndex = getDailyStartIndex(quotePool.length)
  paintHeroQuote(quotePool[quoteIndex], false)

  if (quotePool.length === 1) {
    return
  }

  window.setInterval(() => {
    if (document.hidden) {
      return
    }

    quoteIndex = (quoteIndex + 1) % quotePool.length
    paintHeroQuote(quotePool[quoteIndex], true)
  }, 12000)
}

function formatDate(isoTime) {
  if (!isoTime) {
    return ''
  }

  const date = new Date(isoTime)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function createProjectCard(project) {
  const card = document.createElement('article')
  card.className = 'project-card'

  const title = document.createElement('h3')
  title.className = 'project-title'

  const titleLink = document.createElement('a')
  titleLink.href = project.html_url
  titleLink.target = '_blank'
  titleLink.rel = 'noreferrer'
  titleLink.textContent = project.name
  title.append(titleLink)

  const desc = document.createElement('p')
  desc.className = 'project-desc'
  desc.textContent = normalizeText(project.description) || '暂无项目描述。'

  const meta = document.createElement('div')
  meta.className = 'project-meta'

  if (project.language) {
    const lang = document.createElement('span')
    lang.textContent = project.language
    meta.append(lang)
  }

  const stars = document.createElement('span')
  stars.textContent = `★ ${project.stargazers_count || 0}`
  meta.append(stars)

  const updated = formatDate(project.updated_at)
  if (updated) {
    const date = document.createElement('span')
    date.textContent = `更新 ${updated}`
    meta.append(date)
  }

  const link = document.createElement('a')
  link.className = 'project-link'
  link.href = project.html_url
  link.target = '_blank'
  link.rel = 'noreferrer'
  link.textContent = '查看仓库'

  card.append(title, desc, meta, link)
  return card
}

function renderGitHubProjects(projects) {
  if (!githubProjectsNode) {
    return
  }

  githubProjectsNode.innerHTML = ''

  if (!Array.isArray(projects) || projects.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'project-empty'
    empty.textContent = '暂时没有可展示的项目。'
    githubProjectsNode.append(empty)
    return
  }

  projects.forEach((project) => githubProjectsNode.append(createProjectCard(project)))
  accentRainCharacters(githubProjectsNode)
}

async function loadGitHubProjects() {
  if (!githubProjectsNode) {
    return
  }

  try {
    const response = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`,
      { headers: { Accept: 'application/vnd.github+json' } }
    )

    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`)
    }

    const repos = await response.json()

    const projects = repos
      .filter((repo) => !repo.fork)
      .filter((repo) => !repo.archived)
      .filter((repo) => repo.name !== `${GITHUB_USERNAME}.github.io`)
      .slice(0, 8)

    renderGitHubProjects(projects.length > 0 ? projects : PROJECT_FALLBACK)
  } catch (_error) {
    renderGitHubProjects(PROJECT_FALLBACK)
  }
}

function formatMatchDateTime(isoTime) {
  const date = new Date(isoTime)

  if (Number.isNaN(date.getTime())) {
    return '时间待定'
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function findCompetition(event) {
  if (!event || !Array.isArray(event.competitions) || event.competitions.length === 0) {
    return null
  }

  return event.competitions[0]
}

function describeMatch(event, teamId) {
  const competition = findCompetition(event)
  const competitors = Array.isArray(competition?.competitors) ? competition.competitors : []

  if (competitors.length === 0) {
    return {
      main: event.shortName || event.name || '比赛',
      meta: formatMatchDateTime(event.date)
    }
  }

  const me = competitors.find((item) => String(item.team?.id) === String(teamId))
  const opponent = competitors.find((item) => String(item.team?.id) !== String(teamId))

  const opponentName =
    opponent?.team?.displayName ||
    opponent?.team?.shortDisplayName ||
    opponent?.team?.name ||
    '对手'

  const side = me?.homeAway === 'home' ? '主场 vs' : '客场 @'
  const leagueName = competition?.league?.name || event.season?.displayName || '足球赛事'
  const dateText = formatMatchDateTime(event.date)

  return {
    main: `${side} ${opponentName}`,
    meta: `${dateText} · ${leagueName}`
  }
}

function renderScheduleList(container, events, teamId, fallbackText) {
  if (!container) {
    return
  }

  container.innerHTML = ''

  if (!Array.isArray(events) || events.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'project-empty'
    empty.textContent = fallbackText
    container.append(empty)
    return
  }

  events.forEach((event) => {
    const match = describeMatch(event, teamId)

    const item = document.createElement('article')
    item.className = 'match-item'

    const main = document.createElement('p')
    main.className = 'match-main'
    main.textContent = match.main

    const meta = document.createElement('p')
    meta.className = 'match-meta'
    meta.textContent = match.meta

    item.append(main, meta)
    container.append(item)
  })

  accentRainCharacters(container)
}

function pickUpcomingEvents(events) {
  if (!Array.isArray(events)) {
    return []
  }

  const now = Date.now() - 60 * 60 * 1000

  return events
    .filter((event) => {
      const timestamp = new Date(event.date).getTime()
      return !Number.isNaN(timestamp) && timestamp >= now
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)
}

async function loadTeamSchedule(target) {
  const container = document.getElementById(target.containerId)
  if (!container) {
    return
  }

  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${target.league}/teams/${target.teamId}/schedule`
    )

    if (!response.ok) {
      throw new Error(`ESPN API ${response.status}`)
    }

    const data = await response.json()
    const events = pickUpcomingEvents(data.events)
    renderScheduleList(container, events, target.teamId, target.fallback)
  } catch (_error) {
    renderScheduleList(container, [], target.teamId, target.fallback)
  }
}

normalizedPoems = poemLibraryRaw.map((poem) => normalizePoem(poem)).filter((poem) => poem !== null)
renderPoetryLibrary(normalizedPoems)
bindPoemModalEvents()
startHeroQuoteRotation(normalizedPoems)
loadGitHubProjects()
SPORTS_TARGETS.forEach((target) => loadTeamSchedule(target))
accentRainCharacters(document.body)
