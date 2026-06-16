// pages/api/exercises.js
// Proxy vers ExerciseDB open source — évite les CORS depuis l'iframe Whop

import { setCorsHeaders } from '../../lib/whopAuth'

const BASE = 'https://oss.exercisedb.dev/api/v1'

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const { bodyPart, search, limit = 50, offset = 0 } = req.query

  try {
    let url
    if (search) {
      url = `${BASE}/exercises/search/${encodeURIComponent(search.toLowerCase())}?limit=${limit}&offset=${offset}`
    } else if (bodyPart && bodyPart !== 'all') {
      url = `${BASE}/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}&offset=${offset}`
    } else {
      url = `${BASE}/exercises?limit=${limit}&offset=${offset}`
    }

    const response = await fetch(url)
    if (!response.ok) throw new Error(`ExerciseDB ${response.status}`)
    const data = await response.json()

    // Normalise : on garde seulement ce dont on a besoin
    const exercises = (Array.isArray(data) ? data : data.exercises || []).map(ex => ({
      id:       ex.exerciseId || ex.id,
      name:     ex.name,
      gifUrl:   ex.gifUrl,
      bodyPart: ex.bodyParts?.[0] || ex.bodyPart || '',
      target:   ex.targetMuscles?.[0] || ex.target || '',
      equipment:ex.equipments?.[0] || ex.equipment || '',
    }))

    return res.status(200).json({ exercises })
  } catch (err) {
    console.error('[exercises proxy]', err.message)
    // Fallback : retourne liste vide plutôt que 500
    return res.status(200).json({ exercises: [], error: err.message })
  }
}
