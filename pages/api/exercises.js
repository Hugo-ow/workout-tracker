// pages/api/exercises.js
// Proxy vers ExerciseDB open source (oss.exercisedb.dev)
// L'API renvoie 25 exercices par page et pagine via meta.nextCursor
// (= l'id du dernier exercice de la page). On suit le cursor jusqu'au bout.

import { setCorsHeaders } from '../../lib/whopAuth'

const BASE = 'https://oss.exercisedb.dev/api/v1'

let CACHE = null
let CACHE_TS = 0
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

async function fetchAllExercises() {
  const seen = new Set()
  const all = []
  let cursor = null
  let pages = 0

  while (pages < 70) {
    pages++
    // NE PAS envoyer de limit : l'API casse sa pagination si on le fait.
    // Elle renvoie ~25/page par défaut, on suit simplement le cursor.
    let url = `${BASE}/exercises`
    if (cursor) url += `?cursor=${encodeURIComponent(cursor)}`

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
    const next = meta.nextCursor
    // Stop si plus de page, pas de cursor, cursor inchangé, ou aucun nouvel ajout
    if (meta.hasNextPage === false) break
    if (!next || next === cursor) break
    if (added === 0) break
    cursor = next
  }

  return all
}

async function getCatalog(force) {
  const now = Date.now()
  if (!force && CACHE && (now - CACHE_TS) < CACHE_TTL) return CACHE
  const all = await fetchAllExercises()
  // On ne met en cache que si on a récupéré une liste plausible (>200)
  if (all.length > 200) { CACHE = all; CACHE_TS = now }
  return all
}

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const { bodyPart, search, limit = 80, offset = 0, refresh } = req.query

  try {
    let list = await getCatalog(refresh === '1')

    if (search) {
      const q = String(search).toLowerCase()
      list = list.filter(ex => ex.name.toLowerCase().includes(q))
    }
    if (bodyPart && bodyPart !== 'all') {
      const bp = String(bodyPart).toLowerCase()
      list = list.filter(ex => ex.bodyPart.toLowerCase() === bp)
    }

    const lim = parseInt(limit) || 80
    const off = parseInt(offset) || 0
    const paged = list.slice(off, off + lim)

    return res.status(200).json({ exercises: paged, total: list.length })
  } catch (err) {
    console.error('[exercises proxy]', err.message)
    return res.status(200).json({ exercises: [], error: err.message })
  }
}
