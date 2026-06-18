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

    const res = await fetch(url, { headers: { accept: 'application/json' } })
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

// Pour "all" ou une recherche globale : on charge tous les bodyParts et on concatène
async function getAll(force) {
  const lists = await Promise.all(ALL_BODY_PARTS.map(bp => getBodyPart(bp, force).catch(() => [])))
  const seen = new Set()
  const all = []
  for (const list of lists) {
    for (const ex of list) {
      if (ex.id && !seen.has(ex.id)) { seen.add(ex.id); all.push(ex) }
    }
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
      // Recherche globale sur tous les bodyParts
      const q = String(search).toLowerCase()
      const all = await getAll(force)
      list = all.filter(ex => ex.name.toLowerCase().includes(q))
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
