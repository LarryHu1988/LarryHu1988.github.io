const menuBtn = document.querySelector('.menu-toggle')
const navLinks = document.querySelector('.nav-links')
const langButtons = document.querySelectorAll('.lang-btn')
const i18nTextNodes = document.querySelectorAll('[data-i18n]')
const i18nHtmlNodes = document.querySelectorAll('[data-i18n-html]')

const yearNode = document.getElementById('year')
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
const LANG_STORAGE_KEY = 'larry-site-lang'
const DEFAULT_LANG = 'zh-Hans'
const POEM_COVER_THEMES = ['theme-a', 'theme-b', 'theme-c', 'theme-d']
const SPORTS_CONFIG = {
  barca: {
    containerId: 'barca-schedule',
    apiFootballTeamId: 529,
    espnLeague: 'esp.1',
    espnTeamId: '83',
    fallbackKey: 'sports_fallback_barca'
  },
  messi: {
    containerId: 'messi-schedule',
    apiFootballTeamId: 9568,
    espnLeague: 'usa.1',
    espnTeamId: '20232',
    fallbackKey: 'sports_fallback_messi'
  }
}

const I18N = {
  'zh-Hans': {
    menu: '菜单',
    nav_poetry: '诗情雨意',
    nav_apps: '数码雨饭',
    nav_sports: '体育风雨',
    nav_insight: '世说心雨',
    nav_notes: '胡言乱雨',
    nav_melody: '如雨如歌',
    nav_cinema: '观影雨感',
    studio_zh_main: '滴水龙雨',
    studio_zh_sub: '工作室',
    intro_zh_title: '滴水龙雨',
    intro_zh_body:
      '生于滴水沿，现居滴水湖。<br />生肖属龙，生时逢雨。<br />半导体行业从业十二年，<br />从产品工程到工艺整合。<br />追梅西，忠巴萨，念科比。<br />看读库，读新诗，写小诗。<br />玩实况，打黑猴，码APP。',
    quote_label: '今日诗句',
    card_poetry: '诗情雨意',
    card_apps: '数码雨饭',
    card_sports: '体育风雨',
    sports_barca: '巴萨赛程',
    sports_messi: '梅西赛程',
    card_insight: '世说心雨',
    card_notes: '胡言乱雨',
    card_melody: '如雨如歌',
    card_cinema: '观影雨感',
    placeholder_todo: '内容待定',
    footer_brand: '滴水龙雨工作室',
    close: '关闭',
    poetry_empty: '诗歌暂未公开。',
    poem_open_label: '打开诗歌《{title}》',
    hero_fallback_text: '“诗歌正在生长。”',
    hero_fallback_source: '龙雨',
    project_no_desc: '暂无项目描述。',
    project_view_repo: '查看仓库',
    project_empty: '暂时没有可展示的项目。',
    project_updated_prefix: '更新',
    sports_fallback_barca: '巴萨赛程加载失败，请稍后刷新。',
    sports_fallback_messi: '梅西赛程加载失败，请稍后刷新。',
    sports_time_pending: '时间待定',
    sports_match_generic: '比赛',
    sports_opponent: '对手',
    sports_home_vs: '主场 vs',
    sports_away_at: '客场 @',
    sports_league_fallback: '足球赛事'
  },
  'zh-Hant': {
    menu: '選單',
    nav_poetry: '詩情雨意',
    nav_apps: '數碼雨飯',
    nav_sports: '體育風雨',
    nav_insight: '世說心雨',
    nav_notes: '胡言亂雨',
    nav_melody: '如雨如歌',
    nav_cinema: '觀影雨感',
    studio_zh_main: '滴水龍雨',
    studio_zh_sub: '工作室',
    intro_zh_title: '滴水龍雨',
    intro_zh_body:
      '生於滴水沿，現居滴水湖。<br />生肖屬龍，生時逢雨。<br />半導體行業從業十二年，<br />從產品工程到工藝整合。<br />追梅西，忠巴薩，念科比。<br />看讀庫，讀新詩，寫小詩。<br />玩實況，打黑猴，碼APP。',
    quote_label: '今日詩句',
    card_poetry: '詩情雨意',
    card_apps: '數碼雨飯',
    card_sports: '體育風雨',
    sports_barca: '巴薩賽程',
    sports_messi: '梅西賽程',
    card_insight: '世說心雨',
    card_notes: '胡言亂雨',
    card_melody: '如雨如歌',
    card_cinema: '觀影雨感',
    placeholder_todo: '內容待定',
    footer_brand: '滴水龍雨工作室',
    close: '關閉',
    poetry_empty: '詩歌暫未公開。',
    poem_open_label: '打開詩歌《{title}》',
    hero_fallback_text: '“詩歌正在生長。”',
    hero_fallback_source: '龍雨',
    project_no_desc: '暫無專案描述。',
    project_view_repo: '查看倉庫',
    project_empty: '暫時沒有可展示的專案。',
    project_updated_prefix: '更新',
    sports_fallback_barca: '巴薩賽程載入失敗，請稍後重新整理。',
    sports_fallback_messi: '梅西賽程載入失敗，請稍後重新整理。',
    sports_time_pending: '時間待定',
    sports_match_generic: '比賽',
    sports_opponent: '對手',
    sports_home_vs: '主場 vs',
    sports_away_at: '客場 @',
    sports_league_fallback: '足球賽事'
  }
}

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

let currentLang = loadStoredLanguage()
let normalizedPoems = []
let quoteIntervalId = null
let latestProjects = []
let latestSportsEntries = {
  barca: [],
  messi: []
}

function t(key) {
  const table = I18N[currentLang] || I18N[DEFAULT_LANG]
  return table[key] || I18N[DEFAULT_LANG][key] || ''
}

function formatTemplate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : ''))
}

function getLocale() {
  return currentLang === 'zh-Hant' ? 'zh-HK' : 'zh-CN'
}

function loadStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY)
    if (stored === 'zh-Hans' || stored === 'zh-Hant') {
      return stored
    }
  } catch (_error) {
    return DEFAULT_LANG
  }

  return DEFAULT_LANG
}

function saveLanguage(lang) {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch (_error) {
    // ignore storage failures
  }
}

function applyLanguage(lang, shouldRefresh = true) {
  currentLang = lang === 'zh-Hant' ? 'zh-Hant' : 'zh-Hans'

  document.documentElement.lang = currentLang === 'zh-Hant' ? 'zh-Hant' : 'zh-CN'

  i18nTextNodes.forEach((node) => {
    const key = node.dataset.i18n
    if (!key) {
      return
    }

    node.textContent = t(key)
  })

  i18nHtmlNodes.forEach((node) => {
    const key = node.dataset.i18nHtml
    if (!key) {
      return
    }

    node.innerHTML = t(key)
  })

  if (menuBtn) {
    menuBtn.setAttribute('aria-label', t('menu'))
  }

  if (poemModalCloseNode) {
    poemModalCloseNode.setAttribute('aria-label', t('close'))
  }

  langButtons.forEach((button) => {
    const langValue = button.dataset.lang
    button.classList.toggle('active', langValue === currentLang)
  })

  saveLanguage(currentLang)

  if (shouldRefresh) {
    renderPoetryLibrary(normalizedPoems)
    startHeroQuoteRotation(normalizedPoems)
    renderGitHubProjects(latestProjects)
    if (hasAnySportsEntries()) {
      renderSportsFromLatestEntries()
    } else {
      loadSportsData()
    }
  }
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
  button.setAttribute('aria-label', formatTemplate(t('poem_open_label'), { title: poem.title }))

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
    empty.textContent = t('poetry_empty')
    poetryLibraryNode.append(empty)
    return
  }

  poems.forEach((poem, index) => {
    poetryLibraryNode.append(createPoemCover(poem, index))
  })
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
    return
  }

  heroPoemTextNode.classList.add('is-switching')
  heroPoemSourceNode.classList.add('is-switching')

  window.setTimeout(() => {
    heroPoemTextNode.textContent = `“${quote.text}”`
    heroPoemSourceNode.textContent = quote.source
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

  if (quoteIntervalId) {
    window.clearInterval(quoteIntervalId)
    quoteIntervalId = null
  }

  const quotePool = buildQuotePool(poems)

  if (quotePool.length === 0) {
    heroPoemTextNode.textContent = t('hero_fallback_text')
    heroPoemSourceNode.textContent = t('hero_fallback_source')
    return
  }

  let quoteIndex = getDailyStartIndex(quotePool.length)
  paintHeroQuote(quotePool[quoteIndex], false)

  if (quotePool.length === 1) {
    return
  }

  quoteIntervalId = window.setInterval(() => {
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

  return date.toLocaleDateString(getLocale(), {
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
  desc.textContent = normalizeText(project.description) || t('project_no_desc')

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
    date.textContent = `${t('project_updated_prefix')} ${updated}`
    meta.append(date)
  }

  const link = document.createElement('a')
  link.className = 'project-link'
  link.href = project.html_url
  link.target = '_blank'
  link.rel = 'noreferrer'
  link.textContent = t('project_view_repo')

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
    empty.textContent = t('project_empty')
    githubProjectsNode.append(empty)
    return
  }

  projects.forEach((project) => githubProjectsNode.append(createProjectCard(project)))
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

    latestProjects = repos
      .filter((repo) => !repo.fork)
      .filter((repo) => !repo.archived)
      .filter((repo) => repo.name !== `${GITHUB_USERNAME}.github.io`)
      .slice(0, 8)

    renderGitHubProjects(latestProjects.length > 0 ? latestProjects : PROJECT_FALLBACK)
  } catch (_error) {
    latestProjects = PROJECT_FALLBACK
    renderGitHubProjects(PROJECT_FALLBACK)
  }
}

function formatMatchDateTime(isoTime) {
  const date = new Date(isoTime)

  if (Number.isNaN(date.getTime())) {
    return t('sports_time_pending')
  }

  return date.toLocaleString(getLocale(), {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function hasAnySportsEntries(entries = latestSportsEntries) {
  return Object.values(entries).some((list) => Array.isArray(list) && list.length > 0)
}

function normalizeScheduleEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const date = normalizeText(entry.date)
  const opponent = normalizeText(entry.opponent)
  const league = normalizeText(entry.league)

  if (!date || !opponent) {
    return null
  }

  const isHome = typeof entry.is_home === 'boolean' ? entry.is_home : Boolean(entry.isHome)

  return {
    date,
    opponent,
    league,
    isHome
  }
}

function normalizeSportsPayload(payload) {
  const normalized = {
    barca: [],
    messi: []
  }

  if (!payload || typeof payload !== 'object') {
    return normalized
  }

  Object.keys(normalized).forEach((key) => {
    const rawList = Array.isArray(payload[key]) ? payload[key] : []
    normalized[key] = rawList.map((entry) => normalizeScheduleEntry(entry)).filter((entry) => entry !== null)
  })

  return normalized
}

function renderScheduleEntries(container, entries, fallbackText) {
  if (!container) {
    return
  }

  container.innerHTML = ''

  if (!Array.isArray(entries) || entries.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'project-empty'
    empty.textContent = fallbackText
    container.append(empty)
    return
  }

  entries.forEach((entry) => {
    const side = entry.isHome ? t('sports_home_vs') : t('sports_away_at')
    const leagueName = entry.league || t('sports_league_fallback')
    const item = document.createElement('article')
    item.className = 'match-item'

    const main = document.createElement('p')
    main.className = 'match-main'
    main.textContent = `${side} ${entry.opponent}`

    const meta = document.createElement('p')
    meta.className = 'match-meta'
    meta.textContent = `${formatMatchDateTime(entry.date)} · ${leagueName}`

    item.append(main, meta)
    container.append(item)
  })
}

function renderSportsFromLatestEntries() {
  Object.entries(SPORTS_CONFIG).forEach(([key, config]) => {
    const container = document.getElementById(config.containerId)
    renderScheduleEntries(container, latestSportsEntries[key], t(config.fallbackKey))
  })
}

function findEspnCompetition(event) {
  if (!event || !Array.isArray(event.competitions) || event.competitions.length === 0) {
    return null
  }

  return event.competitions[0]
}

function toEspnScheduleEntry(event, teamId) {
  if (!event || !event.date) {
    return null
  }

  const competition = findEspnCompetition(event)
  const competitors = Array.isArray(competition?.competitors) ? competition.competitors : []

  if (competitors.length === 0) {
    return {
      date: event.date,
      opponent: event.shortName || event.name || t('sports_opponent'),
      league: competition?.league?.name || event.season?.displayName || t('sports_league_fallback'),
      isHome: true
    }
  }

  const me = competitors.find((item) => String(item.team?.id) === String(teamId))
  const opponent = competitors.find((item) => String(item.team?.id) !== String(teamId))

  return {
    date: event.date,
    opponent:
      opponent?.team?.displayName ||
      opponent?.team?.shortDisplayName ||
      opponent?.team?.name ||
      t('sports_opponent'),
    league: competition?.league?.name || event.season?.displayName || t('sports_league_fallback'),
    isHome: me?.homeAway === 'home'
  }
}

function pickUpcomingEspnEntries(events, teamId) {
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
    .map((event) => toEspnScheduleEntry(event, teamId))
    .filter((entry) => entry !== null)
}

async function loadTeamScheduleFromEspn(key, config) {
  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${config.espnLeague}/teams/${config.espnTeamId}/schedule`
    )

    if (!response.ok) {
      throw new Error(`ESPN API ${response.status}`)
    }

    const data = await response.json()
    latestSportsEntries[key] = pickUpcomingEspnEntries(data.events, config.espnTeamId)
  } catch (_error) {
    latestSportsEntries[key] = []
  }
}

async function loadSportsFromEspnFallback() {
  await Promise.all(
    Object.entries(SPORTS_CONFIG).map(([key, config]) => loadTeamScheduleFromEspn(key, config))
  )

  renderSportsFromLatestEntries()
}

async function loadSportsFromStaticFile() {
  try {
    const response = await fetch('data/sports.json', { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`sports.json ${response.status}`)
    }

    const payload = await response.json()
    const normalized = normalizeSportsPayload(payload)
    if (!hasAnySportsEntries(normalized)) {
      throw new Error('sports payload empty')
    }

    latestSportsEntries = normalized
    renderSportsFromLatestEntries()
    return true
  } catch (_error) {
    return false
  }
}

async function loadSportsData() {
  const loadedFromStatic = await loadSportsFromStaticFile()
  if (loadedFromStatic) {
    return
  }

  await loadSportsFromEspnFallback()
}

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

langButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const lang = button.dataset.lang
    applyLanguage(lang, true)
  })
})

normalizedPoems = poemLibraryRaw.map((poem) => normalizePoem(poem)).filter((poem) => poem !== null)
applyLanguage(currentLang, false)
renderPoetryLibrary(normalizedPoems)
bindPoemModalEvents()
startHeroQuoteRotation(normalizedPoems)
loadGitHubProjects()
loadSportsData()
