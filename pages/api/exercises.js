// pages/api/exercises.js
// Proxy vers ExerciseDB open source (oss.exercisedb.dev)
// L'API pagine via un "cursor" — on suit les pages pour tout récupérer,
// puis on met en cache en mémoire pour éviter de refetch à chaque requête.

import { setCorsHeaders } from '../../lib/whopAuth'

const BASE = 'https://oss.exercisedb.dev/api/v1'

// Cache module-level (persiste tant que la fonction serverless reste chaude)
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
  const all = []
  let cursor = null
  let pages = 0
  // Sécurité : max 60 pages
  while (pages < 60) {
    pages++
    let url = `${BASE}/exercises?limit=100`
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`ExerciseDB ${res.status}`)
    const json = await res.json()
    const data = Array.isArray(json?.data) ? json.data : []
    data.forEach(ex => all.push(normalize(ex)))
    const next = json?.meta?.nextCursor
    const hasNext = json?.meta?.hasNextPage
    if (!hasNext || !next || next === cursor) break
    cursor = next
  }
  return all
}

async function getCatalog() {
  const now = Date.now()
  if (CACHE && (now - CACHE_TS) < CACHE_TTL) return CACHE
  const all = await fetchAllExercises()
  if (all.length) { CACHE = all; CACHE_TS = now }
  return all
}

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const { bodyPart, search, limit = 80, offset = 0 } = req.query

  try {
    let list = await getCatalog()

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
