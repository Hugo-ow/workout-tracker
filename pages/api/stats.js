// pages/api/stats.js
import { supabase } from '../../lib/supabase'
import { verifyWhopToken, setCorsHeaders } from '../../lib/whopAuth'

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const token = req.headers['x-whop-user-token']
  let userId

  if (process.env.NODE_ENV === 'development' && !token) {
    userId = 'dev_user_local'
  } else {
    userId = await verifyWhopToken(token)
    if (!userId) return res.status(401).json({ error: 'Non autorisé' })
  }

  try {
    // ── 1. Séances ──
    const { data: seances } = await supabase
      .from('seances')
      .select('id, date, duree_secondes, volume_total_kg, nb_series')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    const totalSeances = seances?.length || 0
    const totalVolume  = seances?.reduce((s, x) => s + (x.volume_total_kg || 0), 0) || 0
    const totalDuree   = seances?.reduce((s, x) => s + (x.duree_secondes || 0), 0) || 0
    const totalSeries  = seances?.reduce((s, x) => s + (x.nb_series || 0), 0) || 0
    const dureeMoyenne = totalSeances ? Math.round(totalDuree / totalSeances / 60) : 0

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

    // ── 3. Volume 8 dernières semaines ──
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
    const debutSemaine = new Date()
    debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay())
    debutSemaine.setHours(0,0,0,0)
    const volumeSemaine = seances
      ?.filter(s => new Date(s.date) >= debutSemaine)
      ?.reduce((sum, s) => sum + (s.volume_total_kg || 0), 0) || 0

    // Séances ce mois
    const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0,0,0,0)
    const seancesMois = seances?.filter(s => new Date(s.date) >= debutMois)?.length || 0

    // ── 4. PRs ──
    const { data: prs } = await supabase
      .from('records_pr')
      .select('*')
      .eq('user_id', userId)
      .order('estimated_1rm', { ascending: false })
      .limit(20)

    // ── 5. Séries par mouvement cette semaine (Squat, Bench, Deadlift) ──
    const debutSemaineIso = debutSemaine.toISOString()
    const { data: setsSemaine } = await supabase
      .from('seances_sets')
      .select('exercice, kg, reps')
      .eq('user_id', userId)
      .gte('created_at', debutSemaineIso)
      .gt('kg', 0)
      .gt('reps', 0)

    // Mots-clés pour identifier les 3 grands lifts
    const lifts = {
      squat:    { keywords: ['squat', 'hack squat', 'leg press'], series: 0, volume: 0 },
      bench:    { keywords: ['couché', 'couche', 'bench', 'développé'], series: 0, volume: 0 },
      deadlift: { keywords: ['terre', 'deadlift', 'rdl', 'roumain', 'sumo'], series: 0, volume: 0 },
    }

    setsSemaine?.forEach(s => {
      const nom = (s.exercice || '').toLowerCase()
      for (const [key, lift] of Object.entries(lifts)) {
        if (lift.keywords.some(k => nom.includes(k))) {
          lift.series++
          lift.volume += (s.kg || 0) * (s.reps || 0)
          break
        }
      }
    })

    const seriesSemaine = {
      squat:    { series: lifts.squat.series,    volume: Math.round(lifts.squat.volume) },
      bench:    { series: lifts.bench.series,    volume: Math.round(lifts.bench.volume) },
      deadlift: { series: lifts.deadlift.series, volume: Math.round(lifts.deadlift.volume) },
    }

    // ── 6. Évolution 1RM (optionnel, pour graphique futur) ──
    const exerciceParam = req.query.exercice
    let evolution1rm = []
    if (exerciceParam) {
      const { data: sets1rm } = await supabase
        .from('seances_sets')
        .select('kg, reps, created_at')
        .eq('user_id', userId)
        .eq('exercice', exerciceParam)
        .gt('kg', 0).gt('reps', 0)
        .order('created_at', { ascending: true })
        .limit(200)

      const byDate = {}
      sets1rm?.forEach(s => {
        const date = s.created_at.split('T')[0]
        const rm = s.reps === 1 ? s.kg : Math.round((s.kg / (1.0278 - 0.0278 * s.reps)) * 10) / 10
        if (!byDate[date] || rm > byDate[date]) byDate[date] = rm
      })
      evolution1rm = Object.entries(byDate).map(([date, rm]) => ({ date, rm }))
    }

    return res.status(200).json({
      resume: {
        totalSeances,
        totalVolume:   Math.round(totalVolume),
        totalSeries,
        dureeMoyenne,
        streak,
        volumeSemaine: Math.round(volumeSemaine),
        seancesMois,
      },
      volumeParSemaine,
      prs: prs || [],
      seriesSemaine,
      evolution1rm,
    })

  } catch (err) {
    console.error('[stats GET]', err.message)
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message })
  }
}
