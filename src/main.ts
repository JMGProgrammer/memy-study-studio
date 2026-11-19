import './style.css'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import csharp from 'highlight.js/lib/languages/csharp'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import plaintext from 'highlight.js/lib/languages/plaintext'
import { questions, type Question, type Topic } from './questions'

hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('cs', csharp)
hljs.registerLanguage('json', json)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('text', plaintext)
hljs.registerLanguage('plaintext', plaintext)

type Mode = 'adaptive' | 'random' | 'topic' | 'mistakes' | 'exam'
type View = 'quiz' | 'guide' | 'stats' | 'notes'

interface Attempt {
  questionId: string
  topic: Topic
  correct: boolean
  timestamp: number
  durationMs: number
}
interface Review {
  due: number
  intervalDays: number
  ease: number
  lapses: number
}
interface PersistentData {
  attempts: Attempt[]
  reviews: Record<string, Review>
  bookmarks: string[]
  notes: Record<string, string>
  preferences: {
    difficulties: Array<Question['difficulty']>
    sessionSize: number
  }
}
interface SessionState {
  view: View
  mode: Mode
  selectedTopic: Topic | 'Todos'
  queue: Question[]
  currentIndex: number
  selectedAnswer: number | null
  checked: boolean
  correct: number
  wrong: number
  questionStartedAt: number
  toastQuestionId: string | null
  commandOpen: boolean
  examEndsAt: number | null
  examFinished: boolean
  answerOrder: number[]
  onboardingOpen: boolean
}

const STORAGE_KEY = 'dyda-study-studio-v2'
const app = document.querySelector<HTMLDivElement>('#app')!
const emptyData: PersistentData = {
  attempts: [], reviews: {}, bookmarks: [], notes: {},
  preferences: { difficulties: ['Base', 'Intermedio', 'Parcial'], sessionSize: 25 },
}
const old = JSON.parse(localStorage.getItem('dyda-parcial-2-progress') ?? '{}')
const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as PersistentData | null
const data: PersistentData = stored ?? {
  ...emptyData,
  attempts: Array.from({ length: old.answered ?? 0 }, (_, index) => ({
    questionId: `legacy-${index}`,
    topic: 'Arquitectura' as Topic,
    correct: index < (old.correct ?? 0),
    timestamp: Date.now(),
    durationMs: 0,
  })),
}
data.preferences ??= { difficulties: ['Base', 'Intermedio', 'Parcial'], sessionSize: 25 }

const shuffle = <T>(items: T[]) =>
  [...items].map((value) => ({ value, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ value }) => value)

const topics: Array<Topic | 'Todos'> = [
  'Todos', 'Arquitectura', 'Inyección de dependencias', 'HTTP y FromQuery',
  'LINQ y EF Core', 'JSON', 'CSR práctico', 'Blazor y HttpClient', 'JWT',
]

const topicConcepts: Record<Topic, string[]> = {
  'Arquitectura': ['Controller', 'Service', 'Repository', 'capas', 'recorrido'],
  'Inyección de dependencias': ['inyección', 'AddScoped', 'interfaz', 'Scoped', 'contenedor'],
  'HTTP y FromQuery': ['FromQuery', 'query string', 'nullable', 'URL', 'parámetro'],
  'LINQ y EF Core': ['IQueryable', 'IEnumerable', 'ToListAsync', 'Where', 'paginación', 'AsNoTracking'],
  'JSON': ['JSON', 'serializar', 'deserializar', 'objeto anidado', 'array'],
  'CSR práctico': ['Controller', 'Service', 'Repository', 'BuscarAsync', 'validación'],
  'Blazor y HttpClient': ['HttpClient', 'GetFromJsonAsync', 'Service de Blazor', 'URL'],
  'JWT': ['JWT', 'Authorize', '401', '403', 'autenticación', 'autorización'],
}

let guideMarkdown = ''
let guideHtml = ''
let state: SessionState = {
  view: 'quiz',
  mode: 'adaptive',
  selectedTopic: 'Todos',
  queue: [],
  currentIndex: 0,
  selectedAnswer: null,
  checked: false,
  correct: 0,
  wrong: 0,
  questionStartedAt: Date.now(),
  toastQuestionId: null,
  commandOpen: false,
  examEndsAt: null,
  examFinished: false,
  answerOrder: shuffle([0, 1, 2, 3]),
  onboardingOpen: true,
}

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

function highlight(code: string) {
  return escapeHtml(code)
    .replace(/\b(public|private|protected|class|interface|return|if|else|new|async|await|var|throw|using|true|false|null)\b/g, '<span class="kw">$1</span>')
    .replace(/\b(string|int|decimal|bool|void|Task|List|IQueryable|ActionResult)\b/g, '<span class="type">$1</span>')
    .replace(/(&quot;.*?&quot;)/g, '<span class="str">$1</span>')
    .replace(/(\/\/.*)$/gm, '<span class="comment">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="num">$1</span>')
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getQuestionStats(questionId: string) {
  const attempts = data.attempts.filter((attempt) => attempt.questionId === questionId)
  return {
    attempts: attempts.length,
    wrong: attempts.filter((attempt) => !attempt.correct).length,
    accuracy: attempts.length ? Math.round((attempts.filter((attempt) => attempt.correct).length / attempts.length) * 100) : 0,
  }
}

function getTopicStats(topic: Topic) {
  const attempts = data.attempts.filter((attempt) => attempt.topic === topic)
  const correct = attempts.filter((attempt) => attempt.correct).length
  return {
    attempts: attempts.length,
    correct,
    wrong: attempts.length - correct,
    accuracy: attempts.length ? Math.round((correct / attempts.length) * 100) : 0,
  }
}

function adaptiveQueue() {
  const now = Date.now()
  return questions.filter((q) => data.preferences.difficulties.includes(q.difficulty)).sort((a, b) => {
    const reviewA = data.reviews[a.id]
    const reviewB = data.reviews[b.id]
    const dueA = reviewA?.due ?? 0
    const dueB = reviewB?.due ?? 0
    const priorityA = dueA <= now ? 100 + (reviewA?.lapses ?? 0) * 10 : -dueA / 1e9
    const priorityB = dueB <= now ? 100 + (reviewB?.lapses ?? 0) * 10 : -dueB / 1e9
    return priorityB - priorityA || Math.random() - 0.5
  })
}

function buildQueue() {
  if (state.mode === 'adaptive') state.queue = adaptiveQueue()
  else if (state.mode === 'mistakes') {
    const eligible = questions.filter((q) => data.preferences.difficulties.includes(q.difficulty))
    const failed = eligible.filter((q) => getQuestionStats(q.id).wrong > 0)
    state.queue = shuffle(failed.length ? failed : eligible)
  } else if (state.mode === 'exam') state.queue = shuffle(questions)
  else {
    const filtered = questions.filter((q) =>
      data.preferences.difficulties.includes(q.difficulty) &&
      (state.selectedTopic === 'Todos' || q.topic === state.selectedTopic))
    state.queue = shuffle(filtered)
  }
  if (state.mode !== 'exam') state.queue = state.queue.slice(0, data.preferences.sessionSize)
  Object.assign(state, {
    currentIndex: 0, selectedAnswer: null, checked: false, correct: 0,
    wrong: 0, questionStartedAt: Date.now(), toastQuestionId: null,
    answerOrder: shuffle([0, 1, 2, 3]),
  })
}

buildQueue()

function shell(content: string) {
  const attempts = data.attempts.length
  const correct = data.attempts.filter((a) => a.correct).length
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0
  const due = questions.filter((q) => (data.reviews[q.id]?.due ?? 0) <= Date.now() && data.reviews[q.id]).length
  const examTime = state.examEndsAt ? Math.max(0, state.examEndsAt - Date.now()) : 0
  const examLabel = state.examEndsAt ? formatDuration(examTime) : ''

  return `
    <header class="titlebar">
      <div class="brand"><span class="vs-mark">∞</span><strong>DYDA Study Studio</strong><span class="preview">Adaptive</span></div>
      <div class="window-title">Parcial2.sln — ${state.view === 'quiz' ? 'Simulador' : state.view === 'guide' ? 'Mega-Guia.md' : state.view === 'stats' ? 'Estadísticas' : 'Notas'}</div>
      <div class="window-actions"><span>—</span><span>□</span><span>×</span></div>
    </header>
    <nav class="menubar">
      <button data-command="quiz">Práctica</button><button data-command="guide">Guía</button><button data-command="stats">Estadísticas</button>
      <button data-command="exam">Simulacro</button><button data-command="notes">Notas</button>
      <button class="search" id="open-commands">⌕ Comandos y búsqueda <kbd>Ctrl+K</kbd></button>
      ${examLabel ? `<span class="exam-clock">⏱ ${examLabel}</span>` : ''}
    </nav>
    <div class="workspace">
      <aside class="activitybar">
        <button class="activity ${state.view === 'quiz' ? 'active' : ''}" data-view="quiz" title="Práctica">▷</button>
        <button class="activity ${state.view === 'guide' ? 'active' : ''}" data-view="guide" title="Guía">▤</button>
        <button class="activity ${state.view === 'stats' ? 'active' : ''}" data-view="stats" title="Estadísticas">⑂</button>
        <button class="activity ${state.view === 'notes' ? 'active' : ''}" data-view="notes" title="Notas">★</button>
        <div class="activity-spacer"></div><button class="activity" id="open-commands-bottom">⌘</button>
      </aside>
      <aside class="sidebar">
        <div class="panel-title">EXPLORADOR DE ESTUDIO</div>
        <div class="solution">⌄ ▣ Parcial2 <span>(${questions.length})</span></div>
        ${topics.filter((t) => t !== 'Todos').map((topic) => {
          const stat = getTopicStats(topic as Topic)
          return `<button class="tree-item ${state.selectedTopic === topic ? 'selected' : ''}" data-topic="${topic}">
            <span>⌄</span><span class="folder">◆</span><span>${topic}</span><em>${stat.attempts ? stat.accuracy + '%' : '—'}</em></button>`
        }).join('')}
        <div class="sidebar-section">MODOS</div>
        <button class="mode-button ${state.mode === 'adaptive' ? 'selected' : ''}" data-mode="adaptive">⌁ Adaptativo <b>${due}</b></button>
        <button class="mode-button ${state.mode === 'random' ? 'selected' : ''}" data-mode="random">⤨ Aleatorio</button>
        <button class="mode-button ${state.mode === 'mistakes' ? 'selected' : ''}" data-mode="mistakes">⚠ Repetir errores</button>
        <button class="mode-button" data-command="exam">◷ Simulacro 3 h</button>
        <div class="sidebar-section">PERSONALIZAR DIFICULTAD</div>
        ${(['Base', 'Intermedio', 'Parcial'] as const).map((difficulty) =>
          `<button class="mode-button difficulty-filter ${data.preferences.difficulties.includes(difficulty) ? 'selected' : ''}" data-difficulty="${difficulty}">
            ${data.preferences.difficulties.includes(difficulty) ? '☑' : '☐'} ${difficulty}
          </button>`).join('')}
        <div class="session-size">
          <span>Preguntas por sesión</span>
          ${[10, 25, 50].map((size) => `<button data-session-size="${size}" class="${data.preferences.sessionSize === size ? 'selected' : ''}">${size}</button>`).join('')}
        </div>
        <div class="sidebar-progress"><span>Precisión histórica</span><strong>${accuracy}%</strong>
          <div class="meter"><i style="width:${accuracy}%"></i></div><small>${correct} correctas de ${attempts}. Historial permanente.</small></div>
      </aside>
      <main class="editor-area">${content}</main>
    </div>
    <footer class="statusbar"><span>◫ study/main</span><span>↻</span><span>⊗ 0</span><span>⚠ ${data.attempts.filter((a) => !a.correct).length}</span>
      <div></div><span>${state.mode}</span><span>UTF-8</span><span>C# / Markdown</span><span>◉ Local</span></footer>
    ${state.commandOpen ? commandPalette() : ''}
    ${state.toastQuestionId ? errorToast() : ''}
    ${state.onboardingOpen ? onboarding() : ''}
  `
}

function quizView() {
  const question = state.queue[state.currentIndex] ?? questions[0]
  const stats = getQuestionStats(question.id)
  const bookmarked = data.bookmarks.includes(question.id)
  return `
    <div class="tabs"><div class="tab active"><span class="cs-icon">C#</span> ${question.fileName}<button>×</button></div>
      <button class="tab" data-view="guide"><span class="md-icon">M↓</span> Mega-Guia.md</button></div>
    <div class="breadcrumb">Parcial2 <span>›</span> ${question.topic} <span>›</span> ${question.fileName}</div>
    <section class="question-editor">
      <div class="editor-gutter">${Array.from({ length: 24 }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>
      <div class="editor-content">
        <div class="question-meta"><span class="difficulty ${question.difficulty.toLowerCase()}">${question.difficulty}</span>
          <span>${question.topic}</span><span>${state.currentIndex + 1}/${state.queue.length}</span>
          <span>Histórico: ${stats.attempts ? stats.accuracy + '%' : 'sin intentos'}</span>
          <button class="bookmark ${bookmarked ? 'active' : ''}" id="bookmark-question" title="Guardar pregunta">★</button></div>
        <h1>${question.title}</h1><p class="prompt">${question.prompt}</p>
        ${question.context ? `<div class="code-window"><div class="code-head"><span>Código de referencia</span><span>⋯</span></div><pre><code>${highlight(question.context)}</code></pre></div>` : ''}
        <div class="answers">${state.answerOrder.map((answerIndex, displayIndex) => {
          const answer = question.answers[answerIndex]
          const selected = state.selectedAnswer === answerIndex
          const correct = state.checked && answerIndex === question.correctAnswer
          const wrong = state.checked && selected && answerIndex !== question.correctAnswer
          return `<button class="answer ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}" data-answer="${answerIndex}" ${state.checked ? 'disabled' : ''}>
            <span class="answer-key">${String.fromCharCode(65 + displayIndex)}</span>${answer.kind === 'code' ? `<pre><code>${highlight(answer.text)}</code></pre>` : `<span class="answer-text">${answer.text}</span>`}
            ${correct ? '<span class="result-icon">✓</span>' : wrong ? '<span class="result-icon">×</span>' : ''}</button>`
        }).join('')}</div>
        ${state.checked ? `<div class="explanation ${state.selectedAnswer === question.correctAnswer ? 'success' : 'failure'}">
          <div class="explanation-title">${state.selectedAnswer === question.correctAnswer ? '✓ Respuesta correcta' : '⚠ Concepto agregado a repetición'}</div>
          <p>${question.explanation}</p><div class="memory-rule"><strong>Regla:</strong> ${question.memoryRule}</div>
          <button class="inline-link" data-guide-topic="${question.topic}">Abrir teoría relacionada en la guía →</button></div>` : ''}
        <div class="question-note"><label>Nota personal para esta pregunta</label>
          <textarea id="question-note" placeholder="Escribe una asociación, duda o forma de recordarlo...">${escapeHtml(data.notes[question.id] ?? '')}</textarea></div>
        <div class="actions"><button id="reset-session" class="secondary">↻ Nueva sesión</button>
          ${state.checked ? '<button id="next-question" class="primary">Siguiente <kbd>Enter</kbd></button>'
            : `<button id="check-answer" class="primary" ${state.selectedAnswer === null ? 'disabled' : ''}>Comprobar <kbd>Enter</kbd></button>`}</div>
      </div>
      <aside class="minimap">${Array.from({ length: 38 }, (_, i) => `<i style="width:${25 + ((i * 29) % 65)}%"></i>`).join('')}</aside>
    </section>
    <section class="bottom-panel"><div class="panel-tabs"><span class="active">Sesión</span><span>Repetición espaciada</span><span>Historial protegido</span></div>
      <div class="session-stats"><span class="ok">● ${state.correct} correctas</span><span class="bad">● ${state.wrong} para revisar</span>
        <span>Modo: ${state.mode}</span><span>Atajos: 1–4, Enter, G, S, Ctrl+K</span></div></section>`
}

function guideView() {
  return `
    <div class="tabs"><button class="tab" data-view="quiz"><span class="cs-icon">C#</span> Simulador.cs</button>
      <div class="tab active"><span class="md-icon">M↓</span> DYDA-Parcial-2-Mega-Guia.md</div></div>
    <div class="guide-toolbar"><input id="guide-search" placeholder="Buscar en toda la guía..." />
      <button id="toggle-weakness" class="secondary">◉ Mapa de debilidades activo</button><span>Los bordes rojos indican teoría asociada a errores frecuentes.</span></div>
    <section class="guide-layout"><aside class="guide-toc" id="guide-toc"></aside>
      <article class="guide-reader" id="guide-reader">${guideHtml || '<p>Cargando guía completa…</p>'}</article></section>`
}

function statsView() {
  const total = data.attempts.length
  const correct = data.attempts.filter((a) => a.correct).length
  const avg = total ? Math.round(data.attempts.reduce((sum, a) => sum + a.durationMs, 0) / total / 1000) : 0
  const streak = [...data.attempts].reverse().findIndex((a) => !a.correct)
  const currentStreak = streak === -1 ? data.attempts.length : streak
  const recent = data.attempts.slice(-30)
  return `
    <div class="tabs"><div class="tab active">⑂ Estadísticas permanentes</div></div>
    <section class="stats-page">
      <div class="stats-lock">🔒 Este historial no se borra al iniciar una sesión nueva.</div>
      <div class="stat-cards">
        <div><span>Intentos históricos</span><strong>${total}</strong></div>
        <div><span>Precisión</span><strong>${total ? Math.round(correct / total * 100) : 0}%</strong></div>
        <div><span>Racha actual</span><strong>${currentStreak}</strong></div>
        <div><span>Tiempo medio</span><strong>${avg}s</strong></div>
        <div><span>Preguntas guardadas</span><strong>${data.bookmarks.length}</strong></div>
      </div>
      <h2>Precisión por tema</h2>
      <div class="topic-chart">${topics.filter((t) => t !== 'Todos').map((topic) => {
        const stat = getTopicStats(topic as Topic)
        return `<div class="chart-row"><span>${topic}</span><div><i style="width:${stat.accuracy}%"></i></div><strong>${stat.attempts ? stat.accuracy + '%' : '—'}</strong><em>${stat.wrong} errores</em></div>`
      }).join('')}</div>
      <h2>Evolución reciente</h2>
      <div class="history-dots">${recent.length ? recent.map((attempt) => `<i class="${attempt.correct ? 'hit' : 'miss'}" title="${attempt.topic}"></i>`).join('') : '<p>Responde preguntas para construir tu historial.</p>'}</div>
      <h2>Preguntas más difíciles</h2>
      <div class="hard-list">${questions.map((q) => ({ q, ...getQuestionStats(q.id) })).filter((x) => x.wrong).sort((a, b) => b.wrong - a.wrong).slice(0, 8)
        .map((x) => `<button data-jump-question="${x.q.id}"><span>${x.q.title}</span><em>${x.wrong} errores · ${x.accuracy}%</em></button>`).join('') || '<p>Todavía no hay errores registrados.</p>'}</div>
    </section>`
}

function notesView() {
  const items = questions.filter((q) => data.bookmarks.includes(q.id) || data.notes[q.id])
  return `
    <div class="tabs"><div class="tab active">★ Notas y marcadores</div></div>
    <section class="notes-page"><h1>Cuaderno personal</h1><p>Las notas se guardan localmente y se vinculan a cada pregunta.</p>
      <div class="notes-list">${items.map((q) => `<article><header><span>${q.topic}</span><button data-jump-question="${q.id}">Abrir pregunta →</button></header>
        <h3>${q.title} ${data.bookmarks.includes(q.id) ? '★' : ''}</h3><textarea data-note-id="${q.id}" placeholder="Añadir nota…">${escapeHtml(data.notes[q.id] ?? '')}</textarea></article>`).join('') || '<div class="empty-state">Marca una pregunta con ★ o escribe una nota para verla aquí.</div>'}</div></section>`
}

function commandPalette() {
  return `<div class="command-backdrop" id="command-backdrop"><div class="command-palette"><div class="command-input">› Escribe un comando… <kbd>Esc</kbd></div>
    <button data-command="adaptive"><span>⌁</span><div><strong>Iniciar práctica adaptativa</strong><small>Prioriza repasos vencidos y debilidades</small></div></button>
    <button data-command="mistakes"><span>⚠</span><div><strong>Repetir errores</strong><small>Solo preguntas falladas anteriormente</small></div></button>
    <button data-command="guide"><span>▤</span><div><strong>Abrir mega guía</strong><small>Ctrl+G</small></div></button>
    <button data-command="stats"><span>⑂</span><div><strong>Ver estadísticas</strong><small>Ctrl+S</small></div></button>
    <button data-command="exam"><span>◷</span><div><strong>Comenzar simulacro de 3 horas</strong><small>Banco completo sin feedback inmediato</small></div></button>
    <button data-command="notes"><span>★</span><div><strong>Notas y marcadores</strong><small>Preguntas guardadas</small></div></button>
  </div></div>`
}

function errorToast() {
  const q = questions.find((item) => item.id === state.toastQuestionId)!
  return `<aside class="toast-error"><div class="toast-icon">!</div><div><strong>Agregada a Repetir errores</strong>
    <p>${q.title}</p><div><button data-review-now="${q.id}">Revisar ahora</button><button id="dismiss-toast">Después</button></div></div></aside>`
}

function onboarding() {
  return `<div class="onboarding-backdrop">
    <section class="onboarding">
      <header><div class="onboarding-logo">∞</div><div><span>DYDA STUDY STUDIO</span><h1>Prepará tu sesión</h1></div></header>
      <p class="onboarding-intro">El simulador combina práctica adaptativa, repetición espaciada, teoría vinculada y estadísticas históricas. Configura la sesión según cómo quieras estudiar hoy.</p>
      <div class="onboarding-grid">
        <article>
          <span class="step">01</span><h2>Elegí el enfoque</h2>
          <button class="onboarding-choice ${state.mode === 'adaptive' ? 'selected' : ''}" data-onboarding-mode="adaptive"><strong>⌁ Adaptativo</strong><small>Prioriza errores y repasos vencidos.</small></button>
          <button class="onboarding-choice ${state.mode === 'random' ? 'selected' : ''}" data-onboarding-mode="random"><strong>⤨ Aleatorio</strong><small>Mezcla el banco según tus filtros.</small></button>
          <button class="onboarding-choice ${state.mode === 'mistakes' ? 'selected' : ''}" data-onboarding-mode="mistakes"><strong>⚠ Repetir errores</strong><small>Trabaja únicamente tus fallos previos.</small></button>
        </article>
        <article>
          <span class="step">02</span><h2>Nivel de dificultad</h2>
          <p>Puedes combinar niveles. Siempre debe quedar uno activo.</p>
          <div class="onboarding-difficulties">
            ${(['Base', 'Intermedio', 'Parcial'] as const).map((difficulty) =>
              `<button class="${data.preferences.difficulties.includes(difficulty) ? 'selected' : ''}" data-onboarding-difficulty="${difficulty}">
                <span>${data.preferences.difficulties.includes(difficulty) ? '☑' : '☐'}</span><strong>${difficulty}</strong>
              </button>`).join('')}
          </div>
        </article>
        <article>
          <span class="step">03</span><h2>Duración de la sesión</h2>
          <p>El progreso histórico no se borra al cambiar la cantidad.</p>
          <div class="onboarding-sizes">
            ${[10, 25, 50].map((size) => `<button class="${data.preferences.sessionSize === size ? 'selected' : ''}" data-onboarding-size="${size}"><strong>${size}</strong><small>preguntas</small></button>`).join('')}
          </div>
          <div class="onboarding-help"><strong>Atajos</strong><span><kbd>1–4</kbd> responder</span><span><kbd>Enter</kbd> continuar</span><span><kbd>Ctrl+K</kbd> comandos</span></div>
        </article>
      </div>
      <footer><div><span>▤ La guía señala teoría relacionada con tus errores.</span><span>⑂ Tus estadísticas permanecen entre sesiones.</span></div>
        <button id="start-study" class="start-study">Comenzar a estudiar <span>→</span></button></footer>
    </section>
  </div>`
}

function render() {
  const content = state.view === 'quiz' ? quizView() : state.view === 'guide' ? guideView() : state.view === 'stats' ? statsView() : notesView()
  app.innerHTML = shell(content)
  bindEvents()
  if (state.view === 'guide') hydrateGuide()
}

function selectAnswer(index: number) {
  if (!state.checked && !state.examFinished) { state.selectedAnswer = index; render() }
}

function scheduleReview(question: Question, correct: boolean) {
  const previous = data.reviews[question.id] ?? { due: Date.now(), intervalDays: 0, ease: 2.3, lapses: 0 }
  if (!correct) {
    data.reviews[question.id] = { due: Date.now(), intervalDays: 0, ease: Math.max(1.3, previous.ease - .2), lapses: previous.lapses + 1 }
  } else {
    const nextInterval = previous.intervalDays === 0 ? 1 : previous.intervalDays === 1 ? 3 : Math.round(previous.intervalDays * previous.ease)
    data.reviews[question.id] = { ...previous, intervalDays: nextInterval, due: Date.now() + nextInterval * 86400000 }
  }
}

function checkAnswer() {
  if (state.selectedAnswer === null || state.checked) return
  const question = state.queue[state.currentIndex]
  const correct = state.selectedAnswer === question.correctAnswer
  state.checked = true
  correct ? state.correct++ : state.wrong++
  data.attempts.push({ questionId: question.id, topic: question.topic, correct, timestamp: Date.now(), durationMs: Date.now() - state.questionStartedAt })
  scheduleReview(question, correct)
  if (!correct) state.toastQuestionId = question.id
  save()
  render()
}

function nextQuestion() {
  if (!state.checked) { checkAnswer(); return }
  state.currentIndex++
  if (state.currentIndex >= state.queue.length) {
    if (state.mode === 'exam') { state.examFinished = true; state.examEndsAt = null; state.view = 'stats'; render(); return }
    state.queue = state.mode === 'adaptive' ? adaptiveQueue() : shuffle(state.queue)
    state.currentIndex = 0
  }
  Object.assign(state, { selectedAnswer: null, checked: false, questionStartedAt: Date.now(), toastQuestionId: null, answerOrder: shuffle([0, 1, 2, 3]) })
  render()
}

function jumpToQuestion(id: string, mode: Mode = 'mistakes') {
  const question = questions.find((q) => q.id === id)
  if (!question) return
  state.mode = mode
  state.queue = [question, ...adaptiveQueue().filter((q) => q.id !== id)]
  Object.assign(state, { view: 'quiz', currentIndex: 0, selectedAnswer: null, checked: false, toastQuestionId: null, questionStartedAt: Date.now(), answerOrder: shuffle([0, 1, 2, 3]) })
  render()
}

function executeCommand(command: string) {
  state.commandOpen = false
  if (command === 'quiz') state.view = 'quiz'
  if (command === 'guide') state.view = 'guide'
  if (command === 'stats') state.view = 'stats'
  if (command === 'notes') state.view = 'notes'
  if (command === 'adaptive' || command === 'mistakes') {
    state.mode = command
    state.view = 'quiz'
    buildQueue()
  }
  if (command === 'exam') {
    state.mode = 'exam'
    state.view = 'quiz'
    state.examEndsAt = Date.now() + 3 * 60 * 60 * 1000
    state.examFinished = false
    buildQueue()
  }
  render()
}

function bindEvents() {
  document.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach((b) => b.addEventListener('click', () => selectAnswer(Number(b.dataset.answer))))
  document.querySelector('#check-answer')?.addEventListener('click', checkAnswer)
  document.querySelector('#next-question')?.addEventListener('click', nextQuestion)
  document.querySelector('#reset-session')?.addEventListener('click', () => { buildQueue(); render() })
  document.querySelectorAll<HTMLElement>('[data-view]').forEach((el) => el.addEventListener('click', () => { state.view = el.dataset.view as View; render() }))
  document.querySelectorAll<HTMLElement>('[data-command]').forEach((el) => el.addEventListener('click', () => executeCommand(el.dataset.command!)))
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.addEventListener('click', () => { state.mode = b.dataset.mode as Mode; state.view = 'quiz'; buildQueue(); render() }))
  document.querySelectorAll<HTMLButtonElement>('[data-topic]').forEach((b) => b.addEventListener('click', () => { state.mode = 'topic'; state.selectedTopic = b.dataset.topic as Topic; state.view = 'quiz'; buildQueue(); render() }))
  document.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach((button) => button.addEventListener('click', () => {
    const difficulty = button.dataset.difficulty as Question['difficulty']
    const selected = data.preferences.difficulties
    data.preferences.difficulties = selected.includes(difficulty)
      ? (selected.length > 1 ? selected.filter((item) => item !== difficulty) : selected)
      : [...selected, difficulty]
    save(); buildQueue(); render()
  }))
  document.querySelectorAll<HTMLButtonElement>('[data-session-size]').forEach((button) => button.addEventListener('click', () => {
    data.preferences.sessionSize = Number(button.dataset.sessionSize)
    save(); buildQueue(); render()
  }))
  document.querySelectorAll<HTMLElement>('[data-jump-question]').forEach((el) => el.addEventListener('click', () => jumpToQuestion(el.dataset.jumpQuestion!)))
  document.querySelectorAll<HTMLElement>('[data-review-now]').forEach((el) => el.addEventListener('click', () => jumpToQuestion(el.dataset.reviewNow!)))
  document.querySelector('#dismiss-toast')?.addEventListener('click', () => { state.toastQuestionId = null; render() })
  document.querySelector('#open-commands')?.addEventListener('click', () => { state.commandOpen = true; render() })
  document.querySelector('#open-commands-bottom')?.addEventListener('click', () => { state.commandOpen = true; render() })
  document.querySelector('#command-backdrop')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) { state.commandOpen = false; render() } })
  document.querySelector('#bookmark-question')?.addEventListener('click', () => {
    const id = state.queue[state.currentIndex].id
    data.bookmarks = data.bookmarks.includes(id) ? data.bookmarks.filter((x) => x !== id) : [...data.bookmarks, id]
    save(); render()
  })
  document.querySelector<HTMLTextAreaElement>('#question-note')?.addEventListener('change', (event) => {
    data.notes[state.queue[state.currentIndex].id] = (event.target as HTMLTextAreaElement).value; save()
  })
  document.querySelectorAll<HTMLTextAreaElement>('[data-note-id]').forEach((area) => area.addEventListener('change', () => {
    data.notes[area.dataset.noteId!] = area.value; save()
  }))
  document.querySelectorAll<HTMLElement>('[data-guide-topic]').forEach((el) => el.addEventListener('click', () => {
    state.view = 'guide'; render(); setTimeout(() => focusGuideTopic(el.dataset.guideTopic as Topic), 0)
  }))
  document.querySelectorAll<HTMLElement>('[data-onboarding-mode]').forEach((el) => el.addEventListener('click', () => {
    state.mode = el.dataset.onboardingMode as Mode
    render()
  }))
  document.querySelectorAll<HTMLElement>('[data-onboarding-difficulty]').forEach((el) => el.addEventListener('click', () => {
    const difficulty = el.dataset.onboardingDifficulty as Question['difficulty']
    const selected = data.preferences.difficulties
    data.preferences.difficulties = selected.includes(difficulty)
      ? (selected.length > 1 ? selected.filter((item) => item !== difficulty) : selected)
      : [...selected, difficulty]
    save(); render()
  }))
  document.querySelectorAll<HTMLElement>('[data-onboarding-size]').forEach((el) => el.addEventListener('click', () => {
    data.preferences.sessionSize = Number(el.dataset.onboardingSize)
    save(); render()
  }))
  document.querySelector('#start-study')?.addEventListener('click', () => {
    state.onboardingOpen = false
    state.view = 'quiz'
    buildQueue()
    render()
  })
}

async function loadGuide() {
  guideMarkdown = await fetch(`${import.meta.env.BASE_URL}guia-completa.md`).then((response) => response.text())
  guideHtml = await marked.parse(guideMarkdown, { gfm: true })
  if (state.view === 'guide') render()
}

function hydrateGuide() {
  const reader = document.querySelector<HTMLElement>('#guide-reader')
  const toc = document.querySelector<HTMLElement>('#guide-toc')
  if (!reader || !toc || !guideHtml) return
  reader.querySelectorAll<HTMLElement>('pre code').forEach((block) => hljs.highlightElement(block))
  const headings = [...reader.querySelectorAll<HTMLElement>('h1, h2, h3')]
  headings.forEach((heading, index) => {
    heading.id = `guide-${index}`
    toc.insertAdjacentHTML('beforeend', `<button data-heading="${heading.id}" class="level-${heading.tagName.toLowerCase()}">${heading.textContent}</button>`)
  })
  const weakness = new Map<Topic, number>()
  topics.filter((t) => t !== 'Todos').forEach((topic) => weakness.set(topic as Topic, getTopicStats(topic as Topic).wrong))
  reader.querySelectorAll<HTMLElement>('p, li').forEach((element) => {
    const text = element.textContent?.toLowerCase() ?? ''
    const matches = [...weakness.entries()].filter(([topic, count]) => count > 0 && topicConcepts[topic].some((word) => text.includes(word.toLowerCase())))
    if (matches.length) {
      const severity = Math.max(...matches.map(([, count]) => count))
      element.classList.add('weak-concept')
      element.dataset.weakness = severity >= 3 ? 'alta' : 'media'
      element.title = `Relacionado con ${severity} errores históricos`
    }
  })
  toc.querySelectorAll<HTMLButtonElement>('[data-heading]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.heading!)?.scrollIntoView({ behavior: 'smooth' })))
  document.querySelector<HTMLInputElement>('#guide-search')?.addEventListener('input', (event) => {
    const term = (event.target as HTMLInputElement).value.toLowerCase().trim()
    reader.querySelectorAll<HTMLElement>('p, li, h1, h2, h3').forEach((el) => el.classList.toggle('search-match', !!term && (el.textContent?.toLowerCase().includes(term) ?? false)))
    if (term) reader.querySelector('.search-match')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function focusGuideTopic(topic: Topic) {
  const reader = document.querySelector<HTMLElement>('#guide-reader')
  if (!reader) return
  const keywords = topicConcepts[topic]
  const target = [...reader.querySelectorAll<HTMLElement>('h1, h2, h3, p')].find((el) => keywords.some((word) => el.textContent?.toLowerCase().includes(word.toLowerCase())))
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target?.classList.add('focus-concept')
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000)
  const hours = Math.floor(total / 3600).toString().padStart(2, '0')
  const minutes = Math.floor(total % 3600 / 60).toString().padStart(2, '0')
  const seconds = (total % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.commandOpen) { state.commandOpen = false; render(); return }
  if (event.ctrlKey && event.key.toLowerCase() === 'k') { event.preventDefault(); state.commandOpen = !state.commandOpen; render(); return }
  if (event.ctrlKey && event.key.toLowerCase() === 'g') { event.preventDefault(); state.view = 'guide'; render(); return }
  if (event.ctrlKey && event.key.toLowerCase() === 's') { event.preventDefault(); state.view = 'stats'; render(); return }
  if (state.view !== 'quiz') return
  if (event.key === 'Enter') nextQuestion()
  const numeric = Number(event.key)
  if (numeric >= 1 && numeric <= 4) selectAnswer(state.answerOrder[numeric - 1])
})

setInterval(() => {
  if (state.examEndsAt && Date.now() >= state.examEndsAt) {
    state.examEndsAt = null
    state.examFinished = true
    state.view = 'stats'
    render()
  } else if (state.examEndsAt) {
    const clock = document.querySelector('.exam-clock')
    if (clock) clock.textContent = `⏱ ${formatDuration(state.examEndsAt - Date.now())}`
  }
}, 1000)

render()
void loadGuide()
