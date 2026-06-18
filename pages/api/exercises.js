// pages/api/exercises.js
// Proxy vers ExerciseDB open source (oss.exercisedb.dev)
//
// Découvertes clés sur cette API :
//  - GET /exercises (sans param) : limité à 10, pagination cassée (cursor ignoré)
//  - GET /exercises?bodyParts=chest : FILTRE correctement (ex: 191 résultats)
//    et le cursor fonctionne ICI -> on pagine par bodyPart.
//  - GET /bodyparts : liste des bodyParts disponibles.
//
// Stratégie : on charge par bodyPart à la demande (avec pagination cursor),
// puis on met en cache chaque bodyPart en mémoire.

import { setCorsHeaders } from '../../lib/whopAuth'

const BASE = 'https://oss.exercisedb.dev/api/v1'

// Tous les bodyParts ExerciseDB (depuis /bodyparts)
const ALL_BODY_PARTS = [
  'neck', 'lower arms', 'shoulders', 'cardio', 'upper arms',
  'chest', 'lower legs', 'back', 'upper legs', 'waist',
]

const CACHE = {}        // { bodyPart: [exercices normalisés] }
const CACHE_TS = {}     // { bodyPart: timestamp }
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6h

function normalize(ex) {
  return {
    id: ex.exerciseId || ex.id,
    name: ex.name || '',
    gifUrl: ex.gifUrl || '',
    bodyPart: (ex.bodyParts && ex.bodyParts[0]) || ex.bodyPart || '',
    target: (ex.targetMuscles && ex.targetMuscles[0]) || ex.target || '',
    equipment: (ex.equipments && ex.equipments[0]) || ex.equipment || '',
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Charge tous les exercices d'un bodyPart en suivant le cursor
async function fetchBodyPart(bodyPart) {
  const seen = new Set()
  const all = []
  let cursor = null
  let pages = 0

  while (pages < 40) {
    pages++
    let url = `${BASE}/exercises?bodyParts=${encodeURIComponent(bodyPart)}&limit=100`
    if (cursor) url += `&after=${encodeURIComponent(cursor)}`

    let res = await fetch(url, { headers: { accept: 'application/json' } })
    if (res.status === 429) {
      // Petite pause puis un seul retry
      await sleep(400)
      res = await fetch(url, { headers: { accept: 'application/json' } })
    }
    if (!res.ok) throw new Error(`ExerciseDB ${res.status}`)
    const json = await res.json()

    const data = Array.isArray(json?.data) ? json.data : []
    if (data.length === 0) break

    let added = 0
    for (const ex of data) {
      const n = normalize(ex)
      if (n.id && !seen.has(n.id)) { seen.add(n.id); all.push(n); added++ }
    }

    const meta = json?.meta || {}
    if (meta.hasNextPage === false) break
    const next = meta.nextCursor
    if (!next || next === cursor) break
    if (added === 0) break
    cursor = next
    await sleep(120) // petite pause entre pages pour ne pas spammer l'API
  }

  return all
}

async function getBodyPart(bodyPart, force) {
  const now = Date.now()
  if (!force && CACHE[bodyPart] && (now - (CACHE_TS[bodyPart] || 0)) < CACHE_TTL) {
    return CACHE[bodyPart]
  }
  const list = await fetchBodyPart(bodyPart)
  if (list.length) { CACHE[bodyPart] = list; CACHE_TS[bodyPart] = now }
  return list
}

async function searchExercises(term) {
  const url = `${BASE}/exercises/search?search=${encodeURIComponent(term)}&threshold=0.4`
  let res = await fetch(url, { headers: { accept: 'application/json' } })
  if (res.status === 429) {
    await sleep(400)
    res = await fetch(url, { headers: { accept: 'application/json' } })
  }
  if (!res.ok) throw new Error(`ExerciseDB ${res.status}`)
  const json = await res.json()
  const data = Array.isArray(json?.data) ? json.data : []
  // L'endpoint /search renvoie seulement exerciseId/name/gifUrl (pas de bodyParts/target)
  return data.map(normalize)
}

// Pour "all" ou une recherche globale : on charge tous les bodyParts
// SÉQUENTIELLEMENT (pas en parallèle) pour éviter le rate-limit 429 de l'API.
// On donne la priorité au cache déjà chaud, et on borne le temps total
// pour rester sous le timeout serverless.
async function getAll(force) {
  const all = []
  const seen = new Set()
  const deadline = Date.now() + 8000 // garde-fou : 8s max pour rester sous le timeout Vercel

  for (const bp of ALL_BODY_PARTS) {
    if (Date.now() > deadline) break // on arrête proprement, on renvoie ce qu'on a
    let list = []
    try { list = await getBodyPart(bp, force) } catch (e) { list = [] }
    for (const ex of list) {
      if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); all.push(ex) }
    }
    await sleep(80)
  }
  return all
}

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const { bodyPart, search, limit = 200, offset = 0, refresh } = req.query
  const force = refresh === '1'

  try {
    let list

    if (search) {
      // Recherche via l'endpoint dédié /exercises/search (rapide, pas de pagination à gérer)
      list = await searchExercises(String(search))
    } else if (bodyPart && bodyPart !== 'all') {
      list = await getBodyPart(String(bodyPart).toLowerCase(), force)
    } else {
      list = await getAll(force)
    }

    const lim = parseInt(limit) || 200
    const off = parseInt(offset) || 0
    const paged = list.slice(off, off + lim)

    return res.status(200).json({ exercises: paged, total: list.length })
  } catch (err) {
    console.error('[exercises proxy]', err.message)
    return res.status(200).json({ exercises: [], error: err.message })
  }
}
