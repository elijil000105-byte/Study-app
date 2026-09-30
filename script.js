'use strict';
/* ==========================================================
   StudyAI – all logik. Data sparas i localStorage.
   ========================================================== */

/* ---------- Hjälpfunktioner ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const dkey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => dkey(new Date());
const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''; };
const shuffle = a => [...a].sort(() => Math.random() - .5);
const sentences = t => t.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);

/* ---------- State + lagring ---------- */
const LEGACY = 'studyai_v1';
let KEY = LEGACY; // Byts till profilspecifik nyckel vid inloggning
const defaults = {
  theme: 'dark', events: [], xp: 0, streak: 0, last: null, minutes: {}, badges: [], goal: 30, quizBest: 0,
  cards: [
    { id: 'c1', q: 'Vad är fotosyntes?', a: 'Processen där växter omvandlar ljus, vatten och koldioxid till socker och syre.' },
    { id: 'c2', q: 'Vilken organell utför fotosyntesen?', a: 'Kloroplasten.' }
  ],
  notes: [
    { id: 'n1', title: 'Fotosyntes', cat: 'Biologi', updated: Date.now(),
      html: '<p>Fotosyntes är processen där växter omvandlar solljus till kemisk energi. Klorofyll i kloroplasterna fångar ljusenergin. Vatten och koldioxid omvandlas till glukos och syre. Processen är grunden för nästan all mat på jorden.</p>' },
    { id: 'n2', title: 'Cellen', cat: 'Biologi', updated: Date.now(),
      html: '<p>Cellen är livets minsta byggsten. Mitokondrierna producerar energi åt cellen. Cellkärnan innehåller arvsmassan i form av DNA. Cellmembranet styr vad som kommer in och ut ur cellen.</p>' }
  ]
};
const state = {};
/** Läser profilens data; vid fel används standarddata och användaren informeras. */
function loadState() {
  try { Object.assign(state, structuredClone(defaults), JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch { Object.assign(state, structuredClone(defaults)); toast('Data kunde inte läsas. Standarddata laddades.', 'error'); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { toast('Kunde inte spara. Lagringen är full eller blockerad.', 'error'); }
}

/* ---------- Gamification ---------- */
const level = xp => Math.floor(xp / 100) + 1;
const BADGES = [
  { id: 'first', n: 'Första steget', i: 'fa-seedling', t: s => s.xp >= 10 },
  { id: 'cards', n: 'Kortmakare', i: 'fa-clone', t: s => s.cards.length >= 5 },
  { id: 'notes', n: 'Anteckningsfan', i: 'fa-pen', t: s => s.notes.length >= 4 },
  { id: 'lvl3', n: 'Nivå 3', i: 'fa-star', t: s => level(s.xp) >= 3 },
  { id: 'streak3', n: '3 dagar i rad', i: 'fa-fire', t: s => s.streak >= 3 },
  { id: 'quiz', n: 'Quizmästare', i: 'fa-trophy', t: s => s.quizBest >= 80 }
];

/** Räknar upp streak när användaren är aktiv en ny dag. */
function touchStreak() {
  if (state.last === today()) return;
  const diff = state.last ? Math.round((new Date(today()) - new Date(state.last)) / 864e5) : 0;
  state.streak = diff === 1 ? state.streak + 1 : 1;
  state.last = today();
}

/** Ger XP, kollar nya badges och uppdaterar gränssnittet. */
function addXp(n) {
  const before = level(state.xp);
  state.xp += n; touchStreak();
  BADGES.filter(b => !state.badges.includes(b.id) && b.t(state)).forEach(b => {
    state.badges.push(b.id); toast(`🏅 Ny badge: ${b.n}`);
  });
  if (level(state.xp) > before) toast(`🎉 Du nådde nivå ${level(state.xp)}!`);
  save(); renderHud(); renderDashboard();
}

function toast(msg, type = 'info') {
  const t = $('#toast'); t.textContent = msg; t.dataset.type = type; t.setAttribute('role', type === 'error' ? 'alert' : 'status'); t.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 2600);
}

function renderHud() {
  $('#lvl').textContent = `Nivå ${level(state.xp)}`;
  $('#xpBar').style.width = `${state.xp % 100}%`;
  $('#xpTxt').textContent = `${state.xp % 100}/100 XP`;
  $('#streak').textContent = state.streak;
}

/* ---------- Navigering och tema ---------- */
const TITLES = { dashboard: 'Dashboard', flashcards: 'Flashcards', quiz: 'Quizgenerator', notes: 'Anteckningar', assistant: 'AI-assistent', calendar: 'Studieplanering' };
function setView(v) {
  $$('.view').forEach(s => s.classList.toggle('active', s.id === v));
  $$('.nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('#title').textContent = TITLES[v]; $('#title').focus({ preventScroll: true });
  $$('.nav-btn[data-view]').forEach(b => b.setAttribute('aria-current', b.dataset.view === v ? 'page' : 'false'));
  if (v === 'calendar') renderCalendar();
  if (v === 'quiz') renderQuizSetup();
}
$$('.nav-btn[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $('#themeBtn i').className = `fa-solid ${state.theme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
}
$('#themeBtn').addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); save(); });

/* ---------- Dashboard ---------- */
const mins = d => Math.round(state.minutes[d] || 0);
function renderDashboard() {
  const total = Object.values(state.minutes).reduce((a, b) => a + b, 0);
  $('#sToday').textContent = mins(today());
  $('#sTotal').textContent = Math.round(total);
  $('#sCards').textContent = state.cards.length;
  $('#sNotes').textContent = state.notes.length;
  const pct = Math.min(100, mins(today()) / state.goal * 100);
  $('#goalBar').style.width = pct + '%';
  $('#goalTxt').textContent = `${mins(today())} av ${state.goal} minuter (${Math.round(pct)}%)`;

  // Stapeldiagram för de senaste 7 dagarna
  const days = [...Array(7)].map((_, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); return { key: dkey(d), label: d.toLocaleDateString('sv-SE', { weekday: 'short' }) }; });
  drawCharts(days);
  $('#badges').innerHTML = BADGES.map(b => `<div class="badge ${state.badges.includes(b.id) ? 'on' : ''}"><i class="fa-solid ${b.i}"></i>${b.n}</div>`).join('');
}

// Studietimer
let timer = null, secs = 0;
const logMinutes = m => { state.minutes[today()] = (state.minutes[today()] || 0) + m; addXp(Math.max(1, Math.floor(m) * 2)); };
$('#timerBtn').addEventListener('click', () => {
  const btn = $('#timerBtn');
  if (timer) {
    clearInterval(timer); timer = null; logMinutes(secs / 60); secs = 0;
    $('#timerTxt').textContent = '00:00'; btn.innerHTML = '<i class="fa-solid fa-play"></i> Starta studiepass';
  } else {
    timer = setInterval(() => { secs++; $('#timerTxt').textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`; }, 1000);
    btn.innerHTML = '<i class="fa-solid fa-stop"></i> Avsluta pass';
  }
});
$('#log10').addEventListener('click', () => logMinutes(10));

/* ---------- Flashcards (CRUD) ---------- */
const dlg = $('#cardDlg');
function renderCards() {
  $('#cardGrid').innerHTML = state.cards.length ? state.cards.map(c => `
    <div class="flip" data-id="${c.id}"><div class="inner">
      <div class="face">${esc(c.q)}</div><div class="face back">${esc(c.a)}</div></div>
      <div class="acts"><button data-act="edit" aria-label="Redigera"><i class="fa-solid fa-pen"></i></button>
      <button data-act="del" aria-label="Ta bort"><i class="fa-solid fa-trash"></i></button></div></div>`).join('')
    : '<p class="muted">Inga kort ännu. Skapa ditt första kort!</p>';
}
function openCard(c = {}) {
  $('#dlgTitle').textContent = c.id ? 'Redigera kort' : 'Nytt kort';
  $('#cardId').value = c.id || ''; $('#cardQ').value = c.q || ''; $('#cardA').value = c.a || '';
  dlg.showModal();
}
$('#addCard').addEventListener('click', () => openCard());
$('#cardCancel').addEventListener('click', () => dlg.close());
$('#cardForm').addEventListener('submit', () => {
  const id = $('#cardId').value, q = $('#cardQ').value.trim(), a = $('#cardA').value.trim();
  if (id) Object.assign(state.cards.find(c => c.id === id), { q, a });
  else { state.cards.push({ id: uid(), q, a }); addXp(10); }
  save(); renderCards(); renderDashboard();
});
$('#cardGrid').addEventListener('click', e => {
  const el = e.target.closest('.flip'); if (!el) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'edit') openCard(state.cards.find(c => c.id === el.dataset.id));
  else if (act === 'del') { state.cards = state.cards.filter(c => c.id !== el.dataset.id); save(); renderCards(); renderDashboard(); }
  else { el.classList.toggle('on'); if (el.classList.contains('on')) addXp(1); }
});

/* ---------- Quizgenerator ---------- */
let quiz = null;
/** Skapar luckfrågor med flera svarsalternativ från fri text. */
function buildQuiz(text) {
  const words = [...new Set((text.match(/\p{L}{6,}/gu) || []).map(w => w.toLowerCase()))];
  if (words.length < 4) return [];
  return shuffle(sentences(text).filter(s => s.split(/\s+/).length >= 5)).slice(0, 5).map(s => {
    const answer = (s.match(/\p{L}{6,}/gu) || []).sort((a, b) => b.length - a.length)[0];
    if (!answer) return null;
    const lower = answer.toLowerCase();
    const opts = shuffle([lower, ...shuffle(words.filter(w => w !== lower)).slice(0, 3)]);
    return { q: s.replace(answer, '_____'), opts, correct: lower };
  }).filter(Boolean);
}
function renderQuizSetup() {
  const opts = state.notes.map(n => `<option value="${n.id}">${esc(n.title || 'Namnlös')}</option>`).join('');
  $('#quizBox').innerHTML = `<h2>Generera quiz från dina anteckningar</h2>
    <label>Källa<select id="quizSrc"><option value="all">Alla anteckningar</option>${opts}</select></label>
    <button class="btn" id="startQuiz"><i class="fa-solid fa-wand-magic-sparkles"></i> Skapa quiz</button>`;
  $('#startQuiz').addEventListener('click', () => {
    const v = $('#quizSrc').value;
    const text = state.notes.filter(n => v === 'all' || n.id === v).map(n => plain(n.html)).join(' ');
    const qs = buildQuiz(text);
    if (!qs.length) return toast('Skriv längre anteckningar (minst några meningar) för att skapa quiz.');
    quiz = { qs, i: 0, score: 0 }; renderQuestion();
  });
}
function renderQuestion() {
  const { qs, i } = quiz, q = qs[i];
  $('#quizBox').innerHTML = `<div class="row"><span class="muted">Fråga ${i + 1} av ${qs.length}</span><span class="muted">Poäng: ${quiz.score}</span></div>
    <div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
    <p class="quiz-q">${esc(q.q)}</p>
    ${q.opts.map(o => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}
    <div id="nextWrap"></div>`;
  $$('.opt').forEach(b => b.addEventListener('click', () => {
    const ok = b.dataset.o === q.correct; if (ok) quiz.score++;
    $$('.opt').forEach(x => { x.disabled = true; if (x.dataset.o === q.correct) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    $('#nextWrap').innerHTML = `<button class="btn" id="next">${i + 1 < qs.length ? 'Nästa fråga' : 'Visa resultat'}</button>`;
    $('#next').addEventListener('click', () => { quiz.i++; quiz.i < qs.length ? renderQuestion() : renderResult(); });
  }));
}
function renderResult() {
  const pct = Math.round(quiz.score / quiz.qs.length * 100);
  state.quizBest = Math.max(state.quizBest, pct); addXp(quiz.score * 10);
  $('#quizBox').innerHTML = `<div style="text-align:center"><h2>Resultat</h2><div class="score">${pct}%</div>
    <p>${quiz.score} av ${quiz.qs.length} rätt. Du fick +${quiz.score * 10} XP.</p>
    <p class="muted">${pct >= 80 ? 'Starkt jobbat!' : pct >= 50 ? 'Bra början, försök igen.' : 'Läs anteckningarna en gång till.'}</p><br>
    <button class="btn" id="again">Skapa nytt quiz</button></div>`;
  $('#again').addEventListener('click', renderQuizSetup);
}

/* ---------- Anteckningar (rich text, autospar, sök) ---------- */
let currentId = null, saveTimer = null;
const editor = $('#editor');
function renderNoteList() {
  const q = $('#search').value.toLowerCase(), cat = $('#catFilter').value;
  const cats = [...new Set(state.notes.map(n => n.cat).filter(Boolean))];
  $('#catFilter').innerHTML = `<option value="">Alla kategorier</option>` + cats.map(c => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('#cats').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
  const list = state.notes.filter(n => (!cat || n.cat === cat) && (n.title + ' ' + plain(n.html)).toLowerCase().includes(q));
  $('#noteList').innerHTML = list.map(n => `<div class="note-item ${n.id === currentId ? 'active' : ''}" data-id="${n.id}">
    <b>${esc(n.title || 'Namnlös')}</b><br><small>${esc(n.cat || 'Utan kategori')}</small></div>`).join('') || '<p class="muted">Inga träffar.</p>';
}
function openNote(id) {
  const n = state.notes.find(x => x.id === id); if (!n) return;
  currentId = id; $('#noteTitle').value = n.title; $('#noteCat').value = n.cat; editor.innerHTML = n.html; renderNoteList();
}
/** Sparar aktuell anteckning 500 ms efter senaste ändringen. */
function autosave() {
  $('#saveState').textContent = 'Sparar...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const n = state.notes.find(x => x.id === currentId); if (!n) return;
    Object.assign(n, { title: $('#noteTitle').value, cat: $('#noteCat').value.trim(), html: editor.innerHTML, updated: Date.now() });
    save(); renderNoteList(); $('#saveState').textContent = 'Sparad ✓';
  }, 500);
}
[editor, $('#noteTitle'), $('#noteCat')].forEach(el => el.addEventListener('input', autosave));
$('#search').addEventListener('input', renderNoteList);
$('#catFilter').addEventListener('change', renderNoteList);
$('#noteList').addEventListener('click', e => { const it = e.target.closest('.note-item'); if (it) openNote(it.dataset.id); });
$('#newNote').addEventListener('click', () => {
  const n = { id: uid(), title: 'Ny anteckning', cat: '', html: '<p></p>', updated: Date.now() };
  state.notes.unshift(n); addXp(5); openNote(n.id); $('#noteTitle').select();
});
$('#delNote').addEventListener('click', () => {
  if (!currentId || !confirm('Ta bort anteckningen?')) return;
  state.notes = state.notes.filter(n => n.id !== currentId); save();
  currentId = null; $('#noteTitle').value = $('#noteCat').value = ''; editor.innerHTML = '';
  renderNoteList(); renderDashboard();
  if (state.notes[0]) openNote(state.notes[0].id);
});
$$('.toolbar [data-cmd]').forEach(b => b.addEventListener('mousedown', e => {
  e.preventDefault(); document.execCommand(b.dataset.cmd, false, b.dataset.val || null); autosave();
}));

/* ---------- AI-assistent (exempeldata, ingen API-nyckel) ---------- */
const msgs = $('#msgs');
function bubble(text, who) {
  const d = document.createElement('div'); d.className = `msg ${who}`; d.textContent = text;
  msgs.append(d); msgs.scrollTop = msgs.scrollHeight; return d;
}
/** Enkel lokal "AI": hittar meningar i anteckningarna som matchar frågans nyckelord. */
function answer(q) {
  const ql = q.toLowerCase();
  if (/sammanfatta|summering/.test(ql)) {
    return state.notes.length ? 'Sammanfattning av dina anteckningar:\n' + state.notes.map(n => `• ${n.title}: ${sentences(plain(n.html)).slice(0, 2).join(' ')}`).join('\n') : 'Du har inga anteckningar att sammanfatta ännu.';
  }
  if (/quiz|testa/.test(ql)) return 'Gå till fliken Quiz så skapar jag frågor från dina anteckningar. Rätt svar ger 10 XP.';
  const keys = (ql.match(/\p{L}{4,}/gu) || []).map(w => w.slice(0, -1)); // grov stamning
  const hits = state.notes.flatMap(n => sentences(plain(n.html)).map(s => ({ n, s, score: keys.filter(k => s.toLowerCase().includes(k)).length })))
    .filter(h => h.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
  return hits.length ? `Enligt dina anteckningar (${hits[0].n.title}):\n${hits.map(h => h.s).join(' ')}`
    : 'Jag hittar inget om det i dina anteckningar. Testa att lägga till en anteckning om ämnet, så kan jag svara nästa gång.';
}
function ask(q) {
  if (!q.trim()) return;
  bubble(q, 'user'); const t = bubble('', 'ai typing');
  setTimeout(() => { t.classList.remove('typing'); t.textContent = answer(q); msgs.scrollTop = msgs.scrollHeight; addXp(2); }, 700);
}
$('#chatForm').addEventListener('submit', e => { e.preventDefault(); ask($('#chatIn').value); $('#chatIn').value = ''; });
$$('.chips button').forEach(b => b.addEventListener('click', () => ask(b.textContent)));

/* ---------- Diagram (Chart.js) ---------- */
const charts = {};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function drawCharts(days) {
  renderRecs();
  if (typeof Chart === 'undefined') { if (!drawCharts.warned) { drawCharts.warned = true; toast('Diagram kunde inte laddas. Kontrollera din anslutning.', 'error'); } return; }
  try {
    const cs = getComputedStyle(document.documentElement), tx = cs.getPropertyValue('--mu').trim(), pr = cs.getPropertyValue('--pr').trim();
    const make = (id, cfg) => {
      charts[id]?.destroy();
      cfg.options = { responsive: true, maintainAspectRatio: false, animation: reduceMotion ? false : { duration: 900, easing: 'easeOutQuart' }, ...cfg.options };
      charts[id] = new Chart($('#' + id), cfg);
    };
    make('weekChart', { type: 'bar', data: { labels: days.map(d => d.label), datasets: [{ label: 'Minuter', data: days.map(d => mins(d.key)), backgroundColor: pr, borderRadius: 8 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: tx }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: tx }, grid: { color: 'rgba(128,128,160,.2)' } } } } });
    const cats = {}; state.notes.forEach(n => { const c = n.cat || 'Utan kategori'; cats[c] = (cats[c] || 0) + 1; });
    make('catChart', { type: 'doughnut', data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: ['#4f5bd5', '#19b8a6', '#f2a33a', '#e5637d', '#8a6cf0', '#5aa9ff'], borderWidth: 0 }] },
      options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: tx } } } } });
  } catch (err) { toast('Diagramfel: ' + err.message, 'error'); }
}

/* ---------- Rekommendationer (regelbaserade, lokala) ---------- */
function renderRecs() {
  const t = mins(today()), due = state.events.filter(e => e.date === today() && !e.done), r = [];
  if (due.length) r.push(['fa-calendar-check', `Du har ${due.length} planerat pass idag: ${due[0].title}.`]);
  if (t < state.goal) r.push(['fa-bullseye', `${state.goal - t} min kvar till dagsmålet. Börja med ett pass på 15 minuter.`]);
  if (state.quizBest < 80) r.push(['fa-circle-question', 'Ta ett quiz på dina anteckningar och sikta på 80 % för badgen Quizmästare.']);
  if (state.cards.length < 5) r.push(['fa-clone', `Skapa ${5 - state.cards.length} flashcards till för badgen Kortmakare.`]);
  if (!state.events.some(e => e.date > today())) r.push(['fa-calendar-plus', 'Planera nästa pass i kalendern så håller du streaken vid liv.']);
  if (!r.length) r.push(['fa-circle-check', 'Du ligger bra till. Repetera dina flashcards för att behålla kunskapen.']);
  $('#recs').innerHTML = r.slice(0, 3).map(([i, x]) => `<li><i class="fa-solid ${i}"></i><span>${esc(x)}</span></li>`).join('');
}

/* ---------- Kalender / studieplanering ---------- */
const cal = { y: new Date().getFullYear(), m: new Date().getMonth(), sel: today() };
function renderCalendar() {
  const first = new Date(cal.y, cal.m, 1), offset = (first.getDay() + 6) % 7, total = new Date(cal.y, cal.m + 1, 0).getDate();
  $('#calTitle').textContent = first.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
  let html = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(d => `<b class="wd">${d}</b>`).join('') + '<span></span>'.repeat(offset);
  for (let d = 1; d <= total; d++) {
    const dt = new Date(cal.y, cal.m, d), key = dkey(dt), n = state.events.filter(e => e.date === key).length;
    const label = dt.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }) + (n ? `, ${n} pass` : '');
    html += `<button class="day ${key === cal.sel ? 'sel' : ''} ${key === today() ? 'now' : ''}" data-d="${key}" aria-pressed="${key === cal.sel}" aria-label="${label}">${d}${n ? '<i class="dot"></i>' : ''}</button>`;
  }
  $('#calGrid').innerHTML = html;
  $('#dayTitle').textContent = new Date(cal.sel).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
  const list = state.events.filter(e => e.date === cal.sel);
  $('#dayList').innerHTML = list.map(e => `<li><input type="checkbox" id="e${e.id}" data-id="${e.id}" ${e.done ? 'checked disabled' : ''}>
    <label for="e${e.id}" style="margin:0;flex:1;color:var(--tx)">${esc(e.title)} <span class="muted">(${e.min} min)</span></label>
    <button class="btn ghost" data-del="${e.id}" aria-label="Ta bort ${esc(e.title)}"><i class="fa-solid fa-trash"></i></button></li>`).join('') || '<li class="muted">Inget planerat. Lägg till ett pass nedan.</li>';
}
$('#calPrev').addEventListener('click', () => { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y--; } renderCalendar(); });
$('#calNext').addEventListener('click', () => { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++; } renderCalendar(); });
$('#calGrid').addEventListener('click', e => { const b = e.target.closest('.day'); if (b) { cal.sel = b.dataset.d; renderCalendar(); $(`.day[data-d="${cal.sel}"]`).focus(); } });
$('#evForm').addEventListener('submit', e => {
  e.preventDefault(); const title = $('#evTitle').value.trim(), min = Math.min(480, Math.max(5, +$('#evMin').value || 30));
  if (!title) return;
  state.events.push({ id: uid(), date: cal.sel, title, min, done: false }); save(); $('#evTitle').value = '';
  renderCalendar(); renderRecs(); toast('Pass planerat', 'success');
});
$('#dayList').addEventListener('click', e => {
  const del = e.target.closest('[data-del]')?.dataset.del, chk = e.target.matches('input[type=checkbox]') ? e.target.dataset.id : null;
  if (del) { state.events = state.events.filter(x => x.id !== del); save(); renderCalendar(); renderRecs(); }
  if (chk) { const ev = state.events.find(x => x.id === chk); ev.done = true; logMinutes(ev.min); renderCalendar(); toast(`Bra jobbat! +${ev.min} min loggade`, 'success'); }
});

/* ---------- Export / import ---------- */
/** Tar bort script, event-attribut och farliga länkar ur importerad HTML. */
const sanitize = html => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(n => n.remove());
  doc.body.querySelectorAll('*').forEach(el => [...el.attributes].forEach(a => { if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name); }));
  return doc.body.innerHTML;
};
const str = (v, max = 5000) => String(v ?? '').slice(0, max);
$('#exportBtn').addEventListener('click', () => {
  try {
    const blob = new Blob([JSON.stringify({ app: 'StudyAI', version: 2, exported: new Date().toISOString(), data: state }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `studyai-${session.id}-${today()}.json` });
    a.click(); URL.revokeObjectURL(a.href); toast('Data exporterad', 'success');
  } catch (err) { toast('Exporten misslyckades: ' + err.message, 'error'); }
});
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    if (f.size > 5e6) throw new Error('Filen är för stor (max 5 MB).');
    const j = JSON.parse(await f.text()), d = j.data || j;
    if (!Array.isArray(d.cards) || !Array.isArray(d.notes)) throw new Error('Filen är inte en giltig StudyAI-export.');
    if (!confirm('Importen ersätter din nuvarande data. Fortsätta?')) return;
    const safe = {
      ...structuredClone(defaults), theme: d.theme === 'light' ? 'light' : 'dark', xp: Math.max(0, +d.xp || 0), streak: Math.max(0, +d.streak || 0),
      last: typeof d.last === 'string' ? d.last : null, goal: Math.min(600, Math.max(5, +d.goal || 30)), quizBest: Math.min(100, +d.quizBest || 0),
      minutes: Object.fromEntries(Object.entries(d.minutes || {}).map(([k, v]) => [str(k, 10), Math.max(0, +v || 0)])),
      badges: (d.badges || []).map(b => str(b, 20)),
      cards: d.cards.map(c => ({ id: str(c.id || uid(), 20), q: str(c.q, 500), a: str(c.a, 1000) })),
      notes: d.notes.map(n => ({ id: str(n.id || uid(), 20), title: str(n.title, 100), cat: str(n.cat, 40), html: sanitize(str(n.html, 200000)), updated: +n.updated || Date.now() })),
      events: (d.events || []).map(x => ({ id: str(x.id || uid(), 20), date: str(x.date, 10), title: str(x.title, 60), min: Math.min(480, +x.min || 30), done: !!x.done }))
    };
    Object.assign(state, safe); save(); currentId = null; refreshAll(); toast('Data importerad', 'success');
  } catch (err) { toast(err instanceof SyntaxError ? 'Importen misslyckades: ogiltig JSON.' : err.message, 'error'); }
});

/* ---------- Inloggning och profiler (lokalt, ingen server) ---------- */
const PROFILES = 'studyai_profiles';
let session = { id: '', name: '' };
const getProfiles = () => { try { return JSON.parse(localStorage.getItem(PROFILES)) || []; } catch { return []; } };
/** SHA-256 när det finns (https/localhost), annars enkel fallback för file://. */
async function hash(text) {
  if (crypto?.subtle) return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(x => x.toString(16).padStart(2, '0')).join('');
  let h = 5381; for (const c of text) h = (h * 33) ^ c.charCodeAt(0); return 'f' + (h >>> 0).toString(16);
}
function showLogin() {
  $('#profiles').innerHTML = getProfiles().map(p => `<button type="button" data-n="${esc(p.name)}"><i class="fa-solid fa-user"></i> ${esc(p.name)}</button>`).join('');
  $('#login').hidden = false; $('#uName').focus();
}
$('#profiles').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { $('#uName').value = b.dataset.n; $('#uPin').focus(); } });
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#loginMsg'), name = $('#uName').value.trim(), pin = $('#uPin').value, id = name.toLowerCase();
  if (!/^[\p{L}\d _-]{2,20}$/u.test(name)) return void (msg.textContent = 'Använd 2–20 tecken: bokstäver, siffror, mellanslag, _ eller -.');
  if (!/^\d{4,8}$/.test(pin)) return void (msg.textContent = 'PIN-koden måste vara 4–8 siffror.');
  const list = getProfiles(), h = await hash(`${id}:${pin}`), found = list.find(p => p.id === id);
  if (found && found.h !== h) { msg.textContent = 'Fel PIN-kod. Försök igen.'; return $('#uPin').select(); }
  if (!found) {
    list.push({ id, name, h });
    try {
      localStorage.setItem(PROFILES, JSON.stringify(list));
      // Första profilen tar över data från version 1 av StudyAI
      if (list.length === 1 && localStorage.getItem(LEGACY)) localStorage.setItem(`${LEGACY}_${id}`, localStorage.getItem(LEGACY));
    } catch { return void (msg.textContent = 'Profilen kunde inte sparas (lagringen är full eller blockerad).'); }
  }
  sessionStorage.setItem('studyai_session', id); msg.textContent = ''; $('#uPin').value = '';
  startSession(id, found?.name || name);
});
function refreshAll() {
  applyTheme(); renderHud(); renderDashboard(); renderCards(); renderNoteList(); renderCalendar();
  if (state.notes[0]) openNote(state.notes[0].id); else { currentId = null; editor.innerHTML = ''; $('#noteTitle').value = $('#noteCat').value = ''; }
}
function startSession(id, name) {
  session = { id, name }; KEY = `${LEGACY}_${id}`; currentId = null; loadState(); refreshAll();
  msgs.innerHTML = ''; bubble(`Hej ${name}! Fråga mig om dina anteckningar, så letar jag upp svaret. Svaren skapas lokalt från exempeldata, utan API-nyckel.`, 'ai');
  $('#logoutBtn').setAttribute('aria-label', `Logga ut ${name}`); $('#login').hidden = true; setView('dashboard');
  toast(`Välkommen, ${name}!`, 'success');
}
$('#logoutBtn').addEventListener('click', () => {
  const wait = $('#saveState').textContent === 'Sparar...' ? 600 : 0; // låt autospar hinna klart
  setTimeout(() => {
    if (timer) { clearInterval(timer); timer = null; secs = 0; $('#timerTxt').textContent = '00:00'; $('#timerBtn').innerHTML = '<i class="fa-solid fa-play"></i> Starta studiepass'; }
    sessionStorage.removeItem('studyai_session'); showLogin();
  }, wait);
});

/* ---------- Tillgänglighet, felhantering och start ---------- */
$('#themeBtn').addEventListener('click', () => setTimeout(renderDashboard, 0)); // rita om diagram med nya färger
new MutationObserver(() => $$('i.fa-solid:not([aria-hidden])').forEach(i => i.setAttribute('aria-hidden', 'true'))).observe(document.body, { childList: true, subtree: true });
addEventListener('error', e => toast('Något gick fel: ' + e.message, 'error'));
addEventListener('unhandledrejection', e => toast('Ett fel uppstod: ' + (e.reason?.message || e.reason), 'error'));

const prof = getProfiles().find(p => p.id === sessionStorage.getItem('studyai_session'));
prof ? startSession(prof.id, prof.name) : showLogin();
setTimeout(() => $('#loader').classList.add('done'), 700);
