// pages/api/seances.js
// POST : sauvegarde une séance complète (séance + sets + PRs)
// GET  : liste les séances d'un utilisateur

import { supabase } from '../../lib/supabase'
import { verifyWhopToken, setCorsHeaders } from '../../lib/whopAuth'

export default async function handler(req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') return res.status(200).end()

  // Authentification
  const token = req.headers['x-whop-user-token']
  let userId

  if (process.env.NODE_ENV === 'development' && !token) {
    userId = 'dev_user_local'
  } else {
    userId = await verifyWhopToken(token)
    if (!userId) return res.status(401).json({ error: 'Non autorisé' })
  }

  // ── POST : Sauvegarder une séance ──
  if (req.method === 'POST') {
    const { nom, duree_secondes, exercises } = req.body

    if (!nom || !exercises?.length) {
      return res.status(400).json({ error: 'Données manquantes' })
    }

    // Calcul du volume total et du nombre de séries
    let volumeTotal = 0
    let nbSeries = 0
    exercises.forEach(ex => {
      ex.sets?.forEach(s => {
        if (s.done && s.kg && s.reps) {
          volumeTotal += s.kg * s.reps
          nbSeries++
        }
      })
    })

    try {
      // 1. Insérer la séance principale
      const { data: seance, error: seanceError } = await supabase
        .from('seances')
        .insert({
          user_id: userId,
          nom,
          duree_secondes: duree_secondes || 0,
          volume_total_kg: Math.round(volumeTotal * 100) / 100,
          nb_exercices: exercises.length,
          nb_series: nbSeries,
        })
        .select()
        .single()

      if (seanceError) throw seanceError

      // 2. Insérer tous les sets
      const setsToInsert = []
      exercises.forEach(ex => {
        ex.sets?.forEach((s, idx) => {
          if (s.done) {
            // Calcul 1RM estimé Brzycki : kg / (1.0278 - 0.0278 * reps)
            const estimated1rm = s.reps === 1
              ? s.kg
              : s.kg > 0 && s.reps > 0
                ? Math.round((s.kg / (1.0278 - 0.0278 * s.reps)) * 10) / 10
                : null

            setsToInsert.push({
              seance_id: seance.id,
              user_id: userId,
              exercice: ex.nom,
              groupe: ex.groupe,
              serie_num: idx + 1,
              kg: s.kg || null,
              reps: s.reps || null,
              is_pr: s.isPR || false,
            })
          }
        })
      })

      if (setsToInsert.length > 0) {
        const { error: setsError } = await supabase
          .from('seances_sets')
          .insert(setsToInsert)

        if (setsError) throw setsError
      }

      // 3. Mettre à jour les PRs
      const prsToUpsert = []
      exercises.forEach(ex => {
        // Trouver le meilleur set de cet exercice dans cette séance
        const doneSets = ex.sets?.filter(s => s.done && s.kg > 0 && s.reps > 0) || []
        if (!doneSets.length) return

        // Meilleur 1RM estimé de la séance pour cet exercice
        const best = doneSets.reduce((best, s) => {
          const rm = s.reps === 1 ? s.kg : s.kg / (1.0278 - 0.0278 * s.reps)
          const bestRm = best.reps === 1 ? best.kg : best.kg / (1.0278 - 0.0278 * best.reps)
          return rm > bestRm ? s : best
        })

        const estimated1rm = best.reps === 1
          ? best.kg
          : Math.round((best.kg / (1.0278 - 0.0278 * best.reps)) * 10) / 10

        prsToUpsert.push({
          user_id: userId,
          exercice: ex.nom,
          best_kg: best.kg,
          best_reps: best.reps,
          estimated_1rm: estimated1rm,
          seance_id: seance.id,
          updated_at: new Date().toISOString(),
        })
      })

      if (prsToUpsert.length > 0) {
        // Upsert : met à jour seulement si le nouveau 1RM est meilleur
        for (const pr of prsToUpsert) {
          const { data: existing } = await supabase
            .from('records_pr')
            .select('estimated_1rm')
            .eq('user_id', userId)
            .eq('exercice', pr.exercice)
            .single()

          if (!existing || pr.estimated_1rm > (existing.estimated_1rm || 0)) {
            await supabase
              .from('records_pr')
              .upsert(pr, { onConflict: 'user_id,exercice' })
          }
        }
      }

      return res.status(201).json({
        success: true,
        seanceId: seance.id,
        volumeTotal: Math.round(volumeTotal),
        nbSeries,
      })

    } catch (err) {
      console.error('[seances POST]', err.message)
      return res.status(500).json({ error: 'Erreur serveur', detail: err.message })
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' })
}
