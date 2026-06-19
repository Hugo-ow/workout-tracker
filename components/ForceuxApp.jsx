// components/ForceuxApp.jsx
// Toute la logique de l'app Forceux en React propre.

import { useState, useEffect, useRef, useCallback } from 'react'
import { GROUPS, GROUP_COLORS, EXERCISE_LIBRARY, getFlatList } from './exerciseLibrary'

function pad(n) { return String(n).padStart(2, '0') }
function formatDuration(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${pad(m)}min`
  return `${m || 1}min`
}

const LS_KEY = 'forceux_session_v2'
let exCounter = 0
let setCounter = 0

export default function ForceuxApp() {
  // ---- Navigation ----
  const [tab, setTab] = useState('seance') // seance | session | historique | stats
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  // ---- Auth ----
  const [userId, setUserId] = useState(null)
  const whopToken = useRef(null)

  // ---- Session ----
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionName, setSessionName] = useState('Séance libre')
  const [editingName, setEditingName] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [exercises, setExercises] = useState([]) // [{uid, name, group, sets:[{uid,kg,reps,done,pr}]}]
  const timerRef = useRef(null)

  // ---- Name modal ----
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')

  // ---- Discard modal ----
  const [discardOpen, setDiscardOpen] = useState(false)

  // ---- Numpad ----
  const [numpad, setNumpad] = useState(null) // {exUid, setUid, field:'kg'|'reps', value:''}

  // ---- Drawer ----
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerGroup, setDrawerGroup] = useState('Tous')
  const [drawerSearch, setDrawerSearch] = useState('')

  // ---- Rest timer ----
  const [restVisible, setRestVisible] = useState(false)
  const [restRem, setRestRem] = useState(0)
  const restTotal = useRef(90)
  const restDur = useRef(90)
  const restIv = useRef(null)
  const restDoneT = useRef(null)

  // ---- PR detection ----
  const prRecords = useRef({}) // {exerciseName: best_kg}
  const [prToast, setPrToast] = useState(null)
  const prToastTimer = useRef(null)
  const sessionPRs = useRef([])

  // ---- Finish screen ----
  const [finishData, setFinishData] = useState(null)

  // ---- Data from server ----
  const [recentSeances, setRecentSeances] = useState([])
  const [historique, setHistorique] = useState([])
  const [stats, setStats] = useState(null)

  // ---- Home date ----
  const [homeDate, setHomeDate] = useState('')

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(whopToken.current ? { 'x-whop-user-token': whopToken.current } : {}),
  }), [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // ====================================================
  //  INIT
  // ====================================================
  useEffect(() => {
    const now = new Date()
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    setHomeDate(`${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`)

    // Auth on load
    const t = setTimeout(() => { initAuth() }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function initAuth() {
    try {
      if (typeof window !== 'undefined' && window.whop && typeof window.whop.getToken === 'function') {
        whopToken.current = await window.whop.getToken()
      }
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (data.userId) {
        setUserId(data.userId)
        loadHistorique()
        loadStats()
      }
    } catch (e) {
      // offline mode, localStorage only
    }
  }

  async function loadHistorique() {
    try {
      const res = await fetch('/api/historique?limit=20', { headers: authHeaders() })
      const data = await res.json()
      if (res.ok && data.seances) {
        setHistorique(data.seances)
        setRecentSeances(data.seances.slice(0, 3))
      }
    } catch (e) {}
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/stats', { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) {
        setStats(data)
        if (data.prs) data.prs.forEach(pr => { prRecords.current[pr.exercice] = pr.best_kg })
      }
    } catch (e) {}
  }

  // ====================================================
  //  SESSION TIMER
  // ====================================================
  useEffect(() => {
    if (sessionActive) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [sessionActive])

  const timerStr = seconds >= 3600
    ? `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
    : `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`

  // ====================================================
  //  LOCAL STORAGE persistence
  // ====================================================
  useEffect(() => {
    if (!sessionActive) return
    const data = { sessionName, seconds, exercises, savedAt: Date.now() }
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch (e) {}
  }, [sessionActive, sessionName, seconds, exercises])

  const [resumeData, setResumeData] = useState(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        const age = Date.now() - (saved.savedAt || 0)
        if (age <= 86400000 && saved.exercises?.length) setResumeData(saved)
        else localStorage.removeItem(LS_KEY)
      }
    } catch (e) {}
  }, [])

  function resumeSession() {
    if (!resumeData) return
    setSessionName(resumeData.sessionName)
    setSeconds(resumeData.seconds || 0)
    setExercises(resumeData.exercises || [])
    sessionPRs.current = []
    setSessionActive(true)
    setResumeData(null)
    setTab('session')
    showToast('⚡ Séance reprise !')
  }

  // ====================================================
  //  START / END SESSION
  // ====================================================
  function openNameModal() {
    setNameInput('')
    setNameModalOpen(true)
  }

  function confirmName() {
    const name = nameInput.trim() || 'Séance libre'
    setNameModalOpen(false)
    startSession(name)
  }

  function startSession(name) {
    exCounter = 0
    setCounter = 0
    sessionPRs.current = []
    setSessionName(name)
    setSeconds(0)
    setExercises([])
    setSessionActive(true)
    setTab('session')
  }

  function doDiscard() {
    setDiscardOpen(false)
    endSession()
  }

  function endSession() {
    clearInterval(timerRef.current)
    setSessionActive(false)
    hideRest()
    try { localStorage.removeItem(LS_KEY) } catch (e) {}
    setExercises([])
    setSeconds(0)
    setTab('seance')
  }

  // ====================================================
  //  EXERCISES & SETS
  // ====================================================
  function addExercise(name, group) {
    const uid = 'ex' + (++exCounter)
    const newSets = [0, 1, 2].map(() => ({ uid: 'set' + (++setCounter), kg: '', reps: '', done: false, pr: false, rpe: null }))
    setExercises(prev => [...prev, { uid, name, group, sets: newSets }])
  }

  function removeExercise(uid) {
    setExercises(prev => prev.filter(e => e.uid !== uid))
  }

  function addSet(exUid) {
    setExercises(prev => prev.map(e => {
      if (e.uid !== exUid) return e
      return { ...e, sets: [...e.sets, { uid: 'set' + (++setCounter), kg: '', reps: '', done: false, pr: false, rpe: null }] }
    }))
  }

  function toggleSet(exUid, setUid) {
    setExercises(prev => prev.map(e => {
      if (e.uid !== exUid) return e
      const sets = e.sets.map(s => {
        if (s.uid !== setUid) return s
        const nowDone = !s.done
        let kg = s.kg, reps = s.reps
        // inherit from previous set if empty
        if (nowDone && !kg && !reps) {
          const idx = e.sets.findIndex(x => x.uid === setUid)
          if (idx > 0) { kg = e.sets[idx - 1].kg; reps = e.sets[idx - 1].reps }
        }
        return { ...s, done: nowDone, kg, reps }
      })
      return { ...e, sets }
    }))
    // PR detection + rest timer on completion
    const ex = exercises.find(e => e.uid === exUid)
    const st = ex?.sets.find(s => s.uid === setUid)
    if (st && !st.done) {
      // becoming done
      const kg = parseFloat(st.kg) || 0
      if (kg > 0 && prRecords.current[ex.name] !== undefined && kg > prRecords.current[ex.name]) {
        const old = prRecords.current[ex.name]
        prRecords.current[ex.name] = kg
        markPR(exUid, setUid)
        sessionPRs.current.push({ nom: ex.name, oldKg: old, newKg: kg })
        showPRToast(ex.name, kg, old)
      }
      startRest()
    }
  }

  function setRpe(exUid, setUid, value) {
    setExercises(prev => prev.map(e => {
      if (e.uid !== exUid) return e
      return { ...e, sets: e.sets.map(s => s.uid === setUid ? { ...s, rpe: s.rpe === value ? null : value } : s) }
    }))
  }

  function markPR(exUid, setUid) {
    setExercises(prev => prev.map(e => {
      if (e.uid !== exUid) return e
      return { ...e, sets: e.sets.map(s => s.uid === setUid ? { ...s, pr: true } : s) }
    }))
  }

  function showPRToast(nom, newKg, oldKg) {
    clearTimeout(prToastTimer.current)
    setPrToast(`${nom.split(' ').slice(0, 3).join(' ')} : ${oldKg} → ${newKg} kg !`)
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([80, 40, 160])
    prToastTimer.current = setTimeout(() => setPrToast(null), 3500)
  }

  // ====================================================
  //  NUMPAD
  // ====================================================
  function openNumpad(exUid, setUid, field) {
    const ex = exercises.find(e => e.uid === exUid)
    const st = ex?.sets.find(s => s.uid === setUid)
    setNumpad({ exUid, setUid, field, value: st ? String(st[field] || '') : '' })
  }
  function npDigit(d) {
    setNumpad(np => {
      if (!np) return np
      let v = np.value
      if (d === '.' && (np.field === 'reps' || v.includes('.'))) return np
      if (v === '0' && d !== '.') v = d
      else v += d
      if (v.replace('.', '').length > 5) v = v.slice(0, -1)
      return { ...np, value: v }
    })
  }
  function npDel() { setNumpad(np => np ? { ...np, value: np.value.slice(0, -1) } : np) }
  function npInc(delta) {
    setNumpad(np => {
      if (!np) return np
      const cur = parseFloat(np.value) || 0
      const next = Math.max(0, cur + delta)
      const v = np.field === 'reps' ? String(Math.round(next)) : String(next % 1 === 0 ? next : parseFloat(next.toFixed(1)))
      return { ...np, value: v }
    })
  }
  function npConfirm() {
    if (!numpad) return
    const { exUid, setUid, field, value } = numpad
    setExercises(prev => prev.map(e => {
      if (e.uid !== exUid) return e
      return { ...e, sets: e.sets.map(s => s.uid === setUid ? { ...s, [field]: value } : s) }
    }))
    setNumpad(null)
  }

  // ====================================================
  //  DRAWER (ExerciseDB)
  // ====================================================
  function openDrawer() {
    setDrawerOpen(true)
    setDrawerGroup('Tous')
    setDrawerSearch('')
  }
  function closeDrawer() { setDrawerOpen(false) }

  // Filtrage local, synchrone, instantané — pas d'appel réseau
  const drawerItems = (() => {
    const q = drawerSearch.trim().toLowerCase()
    let list = getFlatList()
    if (drawerGroup !== 'Tous') list = list.filter(ex => ex.group === drawerGroup)
    if (q) list = list.filter(ex => ex.name.toLowerCase().includes(q) || ex.group.toLowerCase().includes(q))
    return list
  })()

  function pickExercise(ex) {
    closeDrawer()
    addExercise(ex.name, ex.group)
  }

  // ====================================================
  //  REST TIMER
  // ====================================================
  function startRest() {
    clearInterval(restIv.current); clearTimeout(restDoneT.current)
    restTotal.current = restDur.current
    setRestRem(restDur.current)
    setRestVisible(true)
    restIv.current = setInterval(() => {
      setRestRem(r => {
        if (r <= 1) {
          clearInterval(restIv.current); restIv.current = null
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 200])
          restDoneT.current = setTimeout(() => setRestVisible(false), 3000)
          return 0
        }
        return r - 1
      })
    }, 1000)
  }
  function hideRest() {
    setRestVisible(false)
    clearInterval(restIv.current); restIv.current = null
  }
  function skipRest() { clearTimeout(restDoneT.current); hideRest() }
  function adjustRest(d) { setRestRem(r => Math.max(5, r + d)) }

  // ====================================================
  //  FINISH
  // ====================================================
  function collectSessionData() {
    return exercises.map(e => ({
      nom: e.name,
      groupe: e.group,
      sets: e.sets.map(s => ({
        kg: parseFloat(s.kg) || null,
        reps: parseInt(s.reps) || null,
        done: s.done,
        isPR: s.pr,
        rpe: s.rpe ?? null,
      })),
    }))
  }

  async function saveSeanceToServer(nom, dureeSecondes, exData) {
    try {
      const res = await fetch('/api/seances', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ nom, duree_secondes: dureeSecondes, exercises: exData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    } catch (e) { return null }
  }

  function finishSession() {
    const nbEx = exercises.length
    if (nbEx === 0) { showToast('⚠️ Ajoute au moins un exercice !'); return }
    const allSets = exercises.flatMap(e => e.sets)
    const nbSets = allSets.length
    const doneSets = allSets.filter(s => s.done)
    const nbDone = doneSets.length
    let totalKg = 0
    doneSets.forEach(s => { totalKg += (parseFloat(s.kg) || 0) * (parseInt(s.reps) || 0) })

    const exData = collectSessionData()
    saveSeanceToServer(sessionName, seconds, exData).then(result => {
      if (result?.success) setTimeout(() => { loadHistorique(); loadStats() }, 500)
    })

    setFinishData({
      dur: formatDuration(seconds),
      nbEx, nbSets, nbDone,
      totalKg,
      prs: [...sessionPRs.current],
      name: sessionName,
    })
  }

  function closeFinish() {
    setFinishData(null)
    endSession()
  }

  // ====================================================
  //  RENDER HELPERS
  // ====================================================
  const doneCount = exercises.flatMap(e => e.sets).filter(s => s.done).length

  return (
    <div id="app">
      {/* ===== NAME MODAL ===== */}
      <Overlay open={nameModalOpen}>
        <div className="modal-box" style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>💪</div>
          <div className="modal-title" style={{ textAlign: 'center', fontSize: 18, marginBottom: 6 }}>Nommer la séance</div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
            Donne un nom à ta séance ou laisse vide pour continuer.
          </p>
          <input className="set-input" style={{ textAlign: 'left', padding: '12px 14px', marginBottom: 20, fontSize: 15 }}
            type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
            placeholder="Ex: Squat & Bench, Hypertrophie…" maxLength={40}
            onKeyDown={e => { if (e.key === 'Enter') confirmName() }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={() => setNameModalOpen(false)}>Annuler</button>
            <button className="btn-cta" onClick={confirmName}>Démarrer</button>
          </div>
        </div>
      </Overlay>

      {/* ===== DISCARD MODAL ===== */}
      <Overlay open={discardOpen}>
        <div className="modal-box" style={{ maxWidth: 320 }}>
          <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
          <div className="modal-title" style={{ textAlign: 'center', fontSize: 17 }}>Abandonner la séance ?</div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
            Tes données ne seront pas sauvegardées.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={() => setDiscardOpen(false)}>Continuer</button>
            <button className="btn-cta" onClick={doDiscard}>Abandonner</button>
          </div>
        </div>
      </Overlay>

      {/* ===== NUMPAD ===== */}
      <div className={'numpad-overlay' + (numpad ? ' open' : '')} onClick={() => setNumpad(null)} />
      <div className={'numpad' + (numpad ? ' open' : '')}>
        <div className="numpad-header">
          <span className="numpad-label">{numpad?.field === 'kg' ? 'Poids (kg)' : 'Répétitions'}</span>
          <span className={'numpad-display' + (numpad?.value ? ' has-value' : '')}>{numpad?.value || '—'}</span>
        </div>
        <div className="numpad-increments">
          {(numpad?.field === 'kg' ? [0.5, 1, 2.5, 5] : [1, 2, 5]).map(d => (
            <button key={d} className="inc-btn" onClick={() => npInc(d)}>+{d}</button>
          ))}
        </div>
        <div className="numpad-grid">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(d => (
            <button key={d} className="np-btn" onClick={() => npDigit(d)}>{d}</button>
          ))}
          <button className="np-btn del" onClick={npDel}>⌫</button>
          <button className="np-btn" onClick={() => npDigit('0')}>0</button>
          <button className="np-btn" onClick={() => npDigit('.')}>.</button>
        </div>
        <div className="numpad-half-row">
          <button className="np-btn confirm" style={{ flex: 1 }} onClick={npConfirm}>Confirmer ✓</button>
        </div>
      </div>

      {/* ===== DRAWER ===== */}
      <div className={'drawer-overlay' + (drawerOpen ? ' open' : '')} onClick={closeDrawer} />
      <div className={'drawer' + (drawerOpen ? ' open' : '')}>
        <div className="drawer-handle" />
        <div className="drawer-header">
          <div className="drawer-title">Choisir un exercice</div>
          <button className="rest-adj" onClick={closeDrawer}>✕</button>
        </div>
        <div className="drawer-search-wrap">
          <div className="search-wrap-inner">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="drawer-search" type="text" value={drawerSearch} onChange={e => setDrawerSearch(e.target.value)} placeholder="Rechercher…" autoComplete="off" />
          </div>
        </div>
        <div className="group-tabs">
          {GROUPS.map(g => (
            <button key={g.value} className={'group-tab' + (drawerGroup === g.value ? ' active' : '')}
              onClick={() => setDrawerGroup(g.value)}>{g.label}</button>
          ))}
        </div>
        <div className="drawer-list">
          {drawerItems.length === 0 && <div className="drawer-empty">Aucun résultat.</div>}
          {drawerItems.map(ex => (
            <div key={ex.name} className="drawer-item" onClick={() => pickExercise(ex)}>
              <div className="drawer-item-dot" style={{ background: GROUP_COLORS[ex.group] || GROUP_COLORS.Autre }} />
              <div className="drawer-item-info">
                <div className="drawer-item-name">{ex.name}</div>
                <div className="drawer-item-target">{ex.group}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== REST WIDGET ===== */}
      <div className={'rest-widget' + (restVisible ? ' visible' : '')}>
        <div className="rest-progress-track">
          <div className="rest-progress-fill" style={{ width: (restRem / (restTotal.current || 1) * 100) + '%' }} />
        </div>
        <div className="rest-body">
          <div className="rest-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div className="rest-center">
            <div className="rest-lbl">Repos</div>
            <div className={'rest-cd' + (restRem <= 10 ? ' urgent' : '')}>
              {restRem > 0 ? `${Math.floor(restRem / 60)}:${pad(restRem % 60)}` : '🟢 C\'est parti !'}
            </div>
          </div>
          <button className="rest-adj" onClick={() => adjustRest(-15)}>−</button>
          <button className="rest-adj" onClick={() => adjustRest(15)}>+</button>
          <button className="rest-skip" onClick={skipRest}>Passer →</button>
        </div>
      </div>

      {/* ===== PR TOAST ===== */}
      <div className={'pr-toast' + (prToast ? ' show' : '')}>
        <div className="pr-toast-icon">🏆</div>
        <div className="pr-toast-text">{prToast}</div>
      </div>

      {/* ===== TOAST ===== */}
      <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>

      {/* ===== FINISH SCREEN ===== */}
      <div className={'finish-screen' + (finishData ? ' open' : '')}>
        {finishData && (
          <>
            <div className="finish-scroll">
              <div style={{ textAlign: 'center', padding: '8px 0 32px' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-.5px' }}>Séance terminée !</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text3)', marginTop: 4 }}>{finishData.name}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div className="finish-stat-card">
                  <div className="finish-big" style={{ fontSize: 38 }}>{finishData.dur}</div>
                  <div className="finish-stat-label">Durée</div>
                </div>
                <div className="finish-stat-card">
                  <div className="finish-big accent">{finishData.nbEx}</div>
                  <div className="finish-stat-label">Exercices</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div className="finish-stat-card">
                  <div className="finish-big green">{finishData.nbDone}</div>
                  <div className="finish-stat-label">Séries ✓</div>
                </div>
                <div className="finish-stat-card">
                  <div className="finish-big" style={{ fontSize: 42 }}>
                    {finishData.totalKg >= 1000 ? (finishData.totalKg / 1000).toFixed(1) + 't' : Math.round(finishData.totalKg) + 'kg'}
                  </div>
                  <div className="finish-stat-label">Volume total</div>
                </div>
              </div>
              {finishData.prs.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg,rgba(255,183,3,.12),rgba(255,183,3,.04))', border: '1px solid rgba(255,183,3,.3)', borderRadius: 16, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>🏆</span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold)' }}>{finishData.prs.length} nouveau{finishData.prs.length > 1 ? 'x' : ''} PR !</div>
                  </div>
                  {finishData.prs.map((pr, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{pr.nom}</div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)' }}>{pr.oldKg}kg → <span style={{ color: 'var(--gold)', fontWeight: 800 }}>{pr.newKg}kg</span></div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)' }}>+{(pr.newKg - pr.oldKg).toFixed(1)}kg</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="finish-footer">
              <button className="btn-cta" style={{ flex: 1 }} onClick={closeFinish}>Retour à l'accueil</button>
            </div>
          </>
        )}
      </div>

      {/* ===== TAB: SÉANCE ===== */}
      <div className={'tab-content' + (tab === 'seance' ? ' active' : '')}>
        <div className="page-header">
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 2 }}>{homeDate}</div>
            <div className="page-title">Séance</div>
          </div>
          <div style={{ width: 40, height: 40, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M6 20v-2a6 6 0 0 1 12 0v2" /></svg>
          </div>
        </div>
        <div className="main-scroll">
          {resumeData && (
            <div className="resume-banner" onClick={resumeSession}>
              <div style={{ fontSize: 24 }}>⚡</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#3A86FF' }}>Séance en cours</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginTop: 1 }}>
                  {resumeData.sessionName} · {resumeData.exercises.length} exercices
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A86FF" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          )}

          <div className="streak-banner">
            <div className="streak-fire">🔥</div>
            <div className="streak-info">
              <div className="streak-num">{stats?.resume?.streak > 0 ? `${stats.resume.streak} jour${stats.resume.streak > 1 ? 's' : ''}` : '0 jour'}</div>
              <div className="streak-label">Série en cours — continue comme ça !</div>
            </div>
          </div>

          <button className="btn-cta pulse" onClick={openNameModal} style={{ marginBottom: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Démarrer une séance vide
          </button>

          <div className="section-label">Séances récentes</div>
          {recentSeances.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 2px' }}>Aucune séance pour l'instant.</div>
          )}
          {recentSeances.map(s => (
            <RecentCard key={s.id} s={s} />
          ))}
        </div>
      </div>

      {/* ===== TAB: SESSION ===== */}
      <div className={'tab-content' + (tab === 'session' ? ' active' : '')}>
        <div className="session-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            {editingName ? (
              <input className="session-name-input" autoFocus defaultValue={sessionName}
                onBlur={e => { setSessionName(e.target.value.trim() || 'Séance libre'); setEditingName(false) }}
                onKeyDown={e => { if (e.key === 'Enter') { setSessionName(e.target.value.trim() || 'Séance libre'); setEditingName(false) } }} />
            ) : (
              <div className="session-name-wrap" onClick={() => setEditingName(true)}>
                <div className="session-name-label">{sessionName}</div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </div>
            )}
            <div className="session-timer" style={{ marginTop: 2 }}>{timerStr}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text3)', lineHeight: 1.6 }}>
              {exercises.length} ex.<br />{doneCount} séries ✓
            </div>
            <button className="rest-skip" onClick={() => setDiscardOpen(true)}>Annuler</button>
          </div>
        </div>
        <div className="session-scroll">
          {exercises.map(ex => (
            <div key={ex.uid} className="exercise-block">
              <div className="exercise-block-header">
                <div>
                  <div className="exercise-block-title">{ex.name}</div>
                  <div className="exercise-block-group" style={{ color: GROUP_COLORS[ex.group] || GROUP_COLORS.Autre }}>{ex.group}</div>
                </div>
                <button className="rest-adj" onClick={() => removeExercise(ex.uid)} style={{ border: 'none', background: 'none' }}>✕</button>
              </div>
              <div className="sets-table-head"><span>#</span><span>Kg</span><span>Reps</span><span></span></div>
              {ex.sets.map((s, i) => (
                <div key={s.uid}>
                  <div className={'set-row' + (s.done ? ' done' : '') + (s.pr ? ' pr-row' : '')}>
                    <div className="set-num">
                      {s.pr ? '🏆' : i + 1}
                      {s.rpe != null && <div className="rpe-badge">@{s.rpe}</div>}
                    </div>
                    <div>
                      <input className="set-input" readOnly value={s.kg} placeholder="—"
                        onClick={() => openNumpad(ex.uid, s.uid, 'kg')} inputMode="none" />
                    </div>
                    <div>
                      <input className="set-input" readOnly value={s.reps} placeholder="—"
                        onClick={() => openNumpad(ex.uid, s.uid, 'reps')} inputMode="none" />
                    </div>
                    <div className={'set-check' + (s.done ? ' checked' : '')} onClick={() => toggleSet(ex.uid, s.uid)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                  </div>
                  {s.done && (
                    <div className="rpe-row">
                      <span className="rpe-label">RPE</span>
                      {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => (
                        <button key={v} className={'rpe-chip' + (s.rpe === v ? ' selected' : '')}
                          onClick={() => setRpe(ex.uid, s.uid, v)}>{v}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button className="add-set-btn" onClick={() => addSet(ex.uid)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Ajouter une série
              </button>
            </div>
          ))}
          <button className="add-exercise-btn" onClick={openDrawer}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Ajouter un exercice
          </button>
        </div>
        <div className="session-footer">
          <button className="finish-btn" onClick={finishSession}>✓ Terminer la séance</button>
        </div>
      </div>

      {/* ===== TAB: HISTORIQUE ===== */}
      <div className={'tab-content' + (tab === 'historique' ? ' active' : '')}>
        <div className="page-header">
          <div className="page-title">Historique</div>
        </div>
        <div className="main-scroll">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            <MiniStat val={historique.length} label="Séances" />
            <MiniStat val={(() => { const t = historique.reduce((a, x) => a + (x.volume_total_kg || 0), 0); return t >= 1000 ? (t / 1000).toFixed(1) + 't' : Math.round(t) + 'kg' })()} label="Volume" />
            <MiniStat val={(stats?.resume?.streak || 0) + '🔥'} label="Série" accent />
          </div>
          <HistoriqueList seances={historique} />
        </div>
      </div>

      {/* ===== TAB: STATS ===== */}
      <div className={'tab-content' + (tab === 'stats' ? ' active' : '')}>
        <div className="page-header">
          <div className="page-title">Stats</div>
        </div>
        <div className="main-scroll">

          {/* Bloc 1 : PRs — charge max + date */}
          <div className="section-label">Records personnels</div>
          <PRList prs={stats?.prs || []} />

          {/* Bloc 2 : Cette semaine */}
          <div className="section-label" style={{ marginTop: 24 }}>Cette semaine</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
            <LiftSeries label="Squat" n={stats?.seriesSemaine?.squat?.series} border />
            <LiftSeries label="Bench" n={stats?.seriesSemaine?.bench?.series} border />
            <LiftSeries label="Deadlift" n={stats?.seriesSemaine?.deadlift?.series} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-card-val accent-val">
                {(() => { const v = stats?.resume?.volumeSemaine || 0; return v >= 1000 ? (v / 1000).toFixed(1) + 't' : Math.round(v) + 'kg' })()}
              </div>
              <div className="stat-card-label">Volume cette semaine</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-val" style={{ color: '#8338EC' }}>
                {(() => {
                  const d = stats?.rpeParSemaine
                  if (!d) return '—'
                  const last = d[d.length - 1]
                  return last?.rpe != null ? last.rpe : '—'
                })()}
              </div>
              <div className="stat-card-label">RPE moy. cette sem.</div>
            </div>
          </div>

          {/* Bloc 3 : Tendance mensuelle */}
          <div className="section-label">Tendance mensuelle</div>
          <div style={{ marginBottom: 10 }}>
            <div className="stat-card">
              <div className="stat-card-val">{stats?.resume?.seancesMois || 0}</div>
              <div className="stat-card-label">Séances ce mois</div>
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>Séries totales / semaine</div>
            <SeriesLineChart data={stats?.seriesParSemaine || []} valueKey="series" color="var(--accent)" />
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>Intensité RPE moy. / semaine <span style={{ color: 'var(--text3)', fontWeight: 500 }}>(Squat · Bench · DL)</span></div>
            <SeriesLineChart data={stats?.rpeParSemaine || []} valueKey="rpe" color="#8338EC" minY={5} maxY={10} unit="" />
          </div>

        </div>
      </div>

      {/* ===== BOTTOM NAV ===== */}
      <nav className="bottom-nav">
        <button className={'nav-btn' + (tab === 'seance' || tab === 'session' ? ' active' : '')} onClick={() => setTab(sessionActive ? 'session' : 'seance')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          Séance
        </button>
        <button className={'nav-btn' + (tab === 'historique' ? ' active' : '')} onClick={() => setTab('historique')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          Historique
        </button>
        <button className={'nav-btn' + (tab === 'stats' ? ' active' : '')} onClick={() => setTab('stats')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          Stats
        </button>
      </nav>
    </div>
  )
}

// ====================================================
//  SUB-COMPONENTS
// ====================================================
function Overlay({ open, children }) {
  return (
    <div style={{
      display: open ? 'flex' : 'none', position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,.75)', zIndex: 500, alignItems: 'center',
      justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)',
    }}>
      {open && children}
    </div>
  )
}

function RecentCard({ s }) {
  const date = new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const dur = s.duree_secondes >= 3600
    ? `${Math.floor(s.duree_secondes / 3600)}h${pad(Math.floor((s.duree_secondes % 3600) / 60))}min`
    : `${Math.floor(s.duree_secondes / 60)}min`
  const vol = s.volume_total_kg >= 1000 ? (s.volume_total_kg / 1000).toFixed(1) + 't' : Math.round(s.volume_total_kg) + 'kg'
  const hasPR = s.exercises?.some(e => e.sets?.some(x => x.is_pr))
  return (
    <div className="card recent-card" style={{ marginBottom: 8 }}>
      <div className="recent-header">
        <div>
          <div className="recent-title">{s.nom} {hasPR && <span className="pr-badge">PR</span>}</div>
          <div className="recent-date">{date} · {dur}</div>
        </div>
      </div>
      <div className="recent-stats">
        <div className="stat-pill">{s.nb_exercices} ex.</div>
        <div className="stat-pill">{s.nb_series} séries</div>
        <div className="stat-pill">{vol}</div>
      </div>
    </div>
  )
}

function MiniStat({ val, label, accent }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: accent ? 'var(--accent)' : 'var(--text)' }}>{val}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function HistoriqueList({ seances }) {
  if (!seances.length) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏋️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Aucune séance enregistrée</div>
        <div style={{ fontSize: 13 }}>Termine ta première séance pour la voir ici !</div>
      </div>
    )
  }
  // group by month
  const byMonth = {}
  seances.forEach(s => {
    const key = new Date(s.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(s)
  })
  return (
    <>
      {Object.entries(byMonth).map(([month, items]) => (
        <div key={month}>
          <div className="history-group-label">{month.charAt(0).toUpperCase() + month.slice(1)}</div>
          {items.map(s => {
            const date = new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
            const dur = s.duree_secondes >= 3600
              ? `${Math.floor(s.duree_secondes / 3600)}h ${pad(Math.floor((s.duree_secondes % 3600) / 60))} min`
              : `${Math.floor(s.duree_secondes / 60)} min`
            const hasPR = s.exercises?.some(e => e.sets?.some(x => x.is_pr))
            return (
              <div key={s.id} className="history-card">
                <div className="history-card-header">
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.nom} {hasPR && <span className="pr-badge">PR</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{date}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>{dur}</div>
                </div>
                <div className="history-card-body">
                  <div className="history-stat"><div className="history-stat-val">{s.nb_exercices}</div><div className="history-stat-label">exercices</div></div>
                  <div className="history-stat"><div className="history-stat-val">{s.nb_series}</div><div className="history-stat-label">séries</div></div>
                  <div className="history-stat"><div className="history-stat-val">{s.volume_total_kg >= 1000 ? (s.volume_total_kg / 1000).toFixed(1) + 't' : Math.round(s.volume_total_kg) + 'kg'}</div><div className="history-stat-label">volume</div></div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}

function PRList({ prs }) {
  if (!prs.length) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 24 }}>Aucun PR enregistré pour l'instant.</div>
  }
  const priority = ['squat', 'bench', 'couché', 'deadlift', 'terre', 'militaire']
  const sorted = [...prs].sort((a, b) => {
    let ai = priority.findIndex(k => a.exercice.toLowerCase().includes(k))
    let bi = priority.findIndex(k => b.exercice.toLowerCase().includes(k))
    if (ai === -1) ai = 99; if (bi === -1) bi = 99
    return ai - bi
  })
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
      {sorted.map((pr, i) => {
        const date = pr.updated_at
          ? new Date(pr.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          : null
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < sorted.length - 1 ? '1px solid var(--divider)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.exercice}</div>
              {date && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{date}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)' }}>{pr.best_kg}<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)' }}>kg</span></div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)' }}>{pr.best_reps} rép.</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LiftSeries({ label, n, border }) {
  return (
    <div style={{ padding: 12, textAlign: 'center', borderRight: border ? '1px solid var(--divider)' : 'none' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>{n != null ? n : '—'}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)' }}>séries</div>
    </div>
  )
}

function SeriesLineChart({ data, valueKey = 'series', color = 'var(--accent)', minY, maxY }) {
  if (!data.length) return <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>Pas encore de données.</div>

  const values = data.map(d => d[valueKey]).filter(v => v != null)
  if (!values.length) return <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 16 }}>Renseigne des RPE pendant tes séances pour voir la tendance.</div>

  const lo = minY != null ? minY : Math.min(...values)
  const hi = maxY != null ? maxY : Math.max(...values, lo + 1)
  const range = hi - lo || 1

  const W = 100, H = 80, PAD = 10
  // Calcule les points uniquement pour les valeurs non-null
  const pts = data.map((d, i) => {
    const v = d[valueKey]
    if (v == null) return null
    const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2)
    const y = PAD + (1 - (v - lo) / range) * (H - PAD * 2)
    return { x, y, v, label: d.label, i }
  })

  // Segments de ligne (ne trace pas à travers les nulls)
  const segments = []
  let current = []
  for (const pt of pts) {
    if (pt) { current.push(pt) }
    else { if (current.length > 1) segments.push(current); current = [] }
  }
  if (current.length > 1) segments.push(current)
  if (current.length === 1) segments.push(current) // point isolé

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 80, overflow: 'visible' }}>
        {[0, 0.5, 1].map((v, i) => (
          <line key={i} x1={PAD} y1={PAD + (1 - v) * (H - PAD * 2)} x2={W - PAD} y2={PAD + (1 - v) * (H - PAD * 2)}
            stroke="var(--divider)" strokeWidth="0.5" />
        ))}
        {segments.map((seg, si) => seg.length > 1 && (
          <path key={si}
            d={seg.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {pts.map((p, i) => p && (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="2.5" fill={color} />
            <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize="5" fill="var(--text2)" fontWeight="700">{p.v}</text>
          </g>
        ))}
        {pts.map((p, i) => !p && (
          <text key={i} x={PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2)} y={H / 2}
            textAnchor="middle" fontSize="5" fill="var(--text3)">—</text>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {data.map((d, i) => (
          <div key={i} style={{ fontSize: 10, fontWeight: 600, color: i === data.length - 1 ? color : 'var(--text3)', textAlign: 'center', flex: 1 }}>{d.label}</div>
        ))}
      </div>
    </div>
  )
}
