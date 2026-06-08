// pages/api/stats.js
// Retourne les stats avancées d'un utilisateur :
// - Résumé global (séances, volume, streak)
// - PRs records
// - Évolution 1RM par exercice (graphique Brzycki)
// - Volume hebdomadaire
// - Répartition par groupe musculaire

import { supabase } from '../../lib/supabase'
import { verifyWhopToken, setCorsHeaders } from '../../lib/whopAuth'

export default async function handler(req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const token = req.headers['x-whop-user-token']
  let userId

if (!token) {
    userId = 'guest_user'
  } else {
    userId = await verifyWhopToken(req.headers)
    if (!userId) userId = 'guest_user'
  }

  try {
    // ── 1. Résumé global ──
    const { data: seances } = await supabase
      .from('seances')
      .select('id, date, duree_secondes, volume_total_kg, nb_series')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    const totalSeances   = seances?.length || 0
    const totalVolume    = seances?.reduce((s, x) => s + (x.volume_total_kg || 0), 0) || 0
    const totalDuree     = seances?.reduce((s, x) => s + (x.duree_secondes || 0), 0) || 0
    const totalSeries    = seances?.reduce((s, x) => s + (x.nb_series || 0), 0) || 0
    const dureeMoyenne   = totalSeances ? Math.round(totalDuree / totalSeances / 60) : 0

    // ── 2. Streak ──
    let streak = 0
    if (seances?.length) {
      const today = new Date(); today.setHours(0,0,0,0)
      const dates = [...new Set(seances.map(s => {
        const d = new Date(s.date); d.setHours(0,0,0,0); return d.getTime()
      }))].sort((a, b) => b - a)

      let current = today.getTime()
      for (const d of dates) {
        const diff = (current - d) / 86400000
        if (diff <= 1) { streak++; current = d }
        else break
      }
    }

    // ── 3. Volume sur les 8 dernières semaines ──
    const volumeParSemaine = []
    for (let i = 7; i >= 0; i--) {
      const debut = new Date(); debut.setDate(debut.getDate() - i * 7 - 6); debut.setHours(0,0,0,0)
      const fin   = new Date(); fin.setDate(fin.getDate() - i * 7); fin.setHours(23,59,59,999)
      const vol = seances
        ?.filter(s => new Date(s.date) >= debut && new Date(s.date) <= fin)
        ?.reduce((sum, s) => sum + (s.volume_total_kg || 0), 0) || 0
      volumeParSemaine.push({ label: `S${8 - i}`, volume: Math.round(vol) })
    }

    // Volume cette semaine
    const debutSemaine = new Date(); debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay()); debutSemaine.setHours(0,0,0,0)
    const volumeSemaine = seances
      ?.filter(s => new Date(s.date) >= debutSemaine)
      ?.reduce((sum, s) => sum + (s.volume_total_kg || 0), 0) || 0

    // ── 4. Records PR ──
    const { data: prs } = await supabase
      .from('records_pr')
      .select('*')
      .eq('user_id', userId)
      .order('estimated_1rm', { ascending: false })
      .limit(20)

    // ── 5. Évolution 1RM par exercice (pour graphique) ──
    const exerciceParam = req.query.exercice
    let evolution1rm = []

    if (exerciceParam) {
      const { data: sets1rm } = await supabase
        .from('seances_sets')
        .select('kg, reps, created_at, seance_id')
        .eq('user_id', userId)
        .eq('exercice', exerciceParam)
        .gt('kg', 0)
        .gt('reps', 0)
        .order('created_at', { ascending: true })
        .limit(200)

      // Grouper par date et garder le meilleur 1RM de chaque jour
      const byDate = {}
      sets1rm?.forEach(s => {
        const date = s.created_at.split('T')[0]
        const rm1 = s.reps === 1 ? s.kg : Math.round((s.kg / (1.0278 - 0.0278 * s.reps)) * 10) / 10
        if (!byDate[date] || rm1 > byDate[date]) byDate[date] = rm1
      })

      evolution1rm = Object.entries(byDate).map(([date, rm]) => ({ date, rm }))
    }

    // ── 6. Répartition par groupe musculaire ──
    const { data: groupeSets } = await supabase
      .from('seances_sets')
      .select('groupe, kg, reps')
      .eq('user_id', userId)
      .gt('kg', 0)
      .gt('reps', 0)

    const groupeVolume = {}
    groupeSets?.forEach(s => {
      const g = s.groupe || 'Autre'
      groupeVolume[g] = (groupeVolume[g] || 0) + (s.kg * s.reps)
    })
    const totalGroupeVol = Object.values(groupeVolume).reduce((a, b) => a + b, 0)
    const groupeStats = Object.entries(groupeVolume)
      .map(([groupe, vol]) => ({
        groupe,
        volume: Math.round(vol),
        pct: totalGroupeVol ? Math.round((vol / totalGroupeVol) * 100) : 0,
      }))
      .sort((a, b) => b.volume - a.volume)

    // ── Réponse ──
    return res.status(200).json({
      resume: {
        totalSeances,
        totalVolume: Math.round(totalVolume),
        totalSeries,
        dureeMoyenne,
        streak,
        volumeSemaine: Math.round(volumeSemaine),
      },
      volumeParSemaine,
      prs: prs || [],
      evolution1rm,
      groupeStats,
      exercicesDisponibles: [...new Set(groupeSets?.map(s => s.groupe) || [])],
    })

  } catch (err) {
    console.error('[stats GET]', err.message)
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message })
  }
}
