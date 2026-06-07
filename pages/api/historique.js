// pages/api/historique.js
// Retourne l'historique des séances d'un utilisateur avec ses sets

import { supabase } from '../../lib/supabase'
import { verifyWhopToken, setCorsHeaders } from '../../lib/whopAuth'

export default async function handler(req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  // Auth
  const token = req.headers['x-whop-user-token']
  let userId

  if (process.env.NODE_ENV === 'development' && !token) {
    userId = 'dev_user_local'
  } else {
    userId = await verifyWhopToken(token)
    if (!userId) return res.status(401).json({ error: 'Non autorisé' })
  }

  const limit  = parseInt(req.query.limit)  || 20
  const offset = parseInt(req.query.offset) || 0

  try {
    // Récupérer les séances paginées
    const { data: seances, error: seancesError, count } = await supabase
      .from('seances')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (seancesError) throw seancesError

    if (!seances?.length) {
      return res.status(200).json({ seances: [], total: 0 })
    }

    // Récupérer les sets pour ces séances
    const seanceIds = seances.map(s => s.id)
    const { data: sets, error: setsError } = await supabase
      .from('seances_sets')
      .select('*')
      .in('seance_id', seanceIds)
      .order('serie_num', { ascending: true })

    if (setsError) throw setsError

    // Grouper les sets par séance
    const setsBySeance = {}
    sets?.forEach(s => {
      if (!setsBySeance[s.seance_id]) setsBySeance[s.seance_id] = []
      setsBySeance[s.seance_id].push(s)
    })

    // Agréger par exercice dans chaque séance
    const seancesWithExercises = seances.map(seance => {
      const seanceSets = setsBySeance[seance.id] || []

      // Grouper par exercice
      const exercicesMap = {}
      seanceSets.forEach(s => {
        if (!exercicesMap[s.exercice]) {
          exercicesMap[s.exercice] = { nom: s.exercice, groupe: s.groupe, sets: [] }
        }
        exercicesMap[s.exercice].sets.push({
          serie_num: s.serie_num,
          kg: s.kg,
          reps: s.reps,
          is_pr: s.is_pr,
        })
      })

      return {
        ...seance,
        exercises: Object.values(exercicesMap),
      }
    })

    return res.status(200).json({
      seances: seancesWithExercises,
      total: count,
    })

  } catch (err) {
    console.error('[historique GET]', err.message)
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message })
  }
}
