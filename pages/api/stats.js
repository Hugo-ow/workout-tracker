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
    userId = await verifyWhopToken(req.headers)
    if (!userId) return res.status(401).json({ error: 'Non autorisé' })
  }

  try {
    // ── 1. Toutes les séances ──
    const { data: seances } = await supabase
      .from('seances')
      .select('id, date, duree_secondes, volume_total_kg, nb_series')
      .eq('user_id', userId)
      .order('date', { ascending: false })

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

    // ── 3. Volume cette semaine ──
    const debutSemaine = new Date()
    debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay())
    debutSemaine.setHours(0,0,0,0)
    const volumeSemaine = seances
      ?.filter(s => new Date(s.date) >= debutSemaine)
      ?.reduce((sum, s) => sum + (s.volume_total_kg || 0), 0) || 0

    // ── 4. Séances ce mois ──
    const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0,0,0,0)
    const seancesMois = seances?.filter(s => new Date(s.date) >= debutMois)?.length || 0

    // ── 5. PRs — charge max + date (pas de 1RM estimé) ──
    const { data: prs } = await supabase
      .from('records_pr')
      .select('exercice, best_kg, best_reps, updated_at')
      .eq('user_id', userId)
      .order('best_kg', { ascending: false })
      .limit(20)

    // ── 6. Séries par mouvement cette semaine (Squat, Bench, Deadlift + variantes) ──
    const debutSemaineIso = debutSemaine.toISOString()
    const { data: setsSemaine } = await supabase
      .from('seances_sets')
      .select('exercice, kg, reps')
      .eq('user_id', userId)
      .gte('created_at', debutSemaineIso)
      .gt('kg', 0)
      .gt('reps', 0)

    const lifts = {
      squat: {
        // Squat et toutes ses variantes (tempo, pause, box, pin, etc.)
        // Exclut explicitement "hack squat" et "gobelet" qui sont différents
        keywords: ['squat'],
        excludes: [],
        series: 0,
      },
      bench: {
        // Développé couché et variantes (larsen, spoto, pause, tempo, feet up, etc.)
        keywords: ['couché', 'couche', 'bench', 'développé couché'],
        excludes: ['décliné', 'incliné', 'militaire', 'arnold'],
        series: 0,
      },
      deadlift: {
        // Soulevé de terre et variantes (déficit, block pulls, sumo, pause, tempo, etc.)
        keywords: ['soulevé', 'deadlift', 'rdl', 'terre'],
        excludes: [],
        series: 0,
      },
    }

    setsSemaine?.forEach(s => {
      const nom = (s.exercice || '').toLowerCase()
      for (const [key, lift] of Object.entries(lifts)) {
        const matches = lift.keywords.some(k => nom.includes(k))
        const excluded = lift.excludes.some(e => nom.includes(e))
        if (matches && !excluded) { lift.series++; break }
      }
    })

    const seriesSemaine = {
      squat:    { series: lifts.squat.series },
      bench:    { series: lifts.bench.series },
      deadlift: { series: lifts.deadlift.series },
    }

    // ── 7. Graphique : séries totales + RPE moyen par semaine (4 semaines glissantes) ──
    const debut4semaines = new Date()
    debut4semaines.setDate(debut4semaines.getDate() - 27)
    debut4semaines.setHours(0,0,0,0)

    const { data: setsGraphique } = await supabase
      .from('seances_sets')
      .select('created_at, exercice, rpe, kg, reps')
      .eq('user_id', userId)
      .gte('created_at', debut4semaines.toISOString())
      .gt('kg', 0)
      .gt('reps', 0)

    // Mots-clés grands lifts (réutilisés pour le RPE)
    const liftKeywords = [
      { keywords: ['squat'], excludes: [] },
      { keywords: ['couché', 'couche', 'bench', 'développé couché'], excludes: ['décliné', 'incliné', 'militaire', 'arnold'] },
      { keywords: ['soulevé', 'deadlift', 'rdl', 'terre'], excludes: [] },
    ]
    function isMainLift(nom) {
      return liftKeywords.some(l =>
        l.keywords.some(k => nom.includes(k)) && !l.excludes.some(e => nom.includes(e))
      )
    }

    // 4 semaines glissantes
    const seriesParSemaine = []
    const rpeParSemaine = []
    const now = new Date()
    for (let i = 3; i >= 0; i--) {
      const fin = new Date(now)
      fin.setDate(fin.getDate() - i * 7)
      fin.setHours(23,59,59,999)
      const debut = new Date(fin)
      debut.setDate(debut.getDate() - 6)
      debut.setHours(0,0,0,0)

      const weekSets = setsGraphique?.filter(s => {
        const d = new Date(s.created_at)
        return d >= debut && d <= fin
      }) || []

      const label = i === 0 ? 'Cette sem.' : `S-${i}`
      seriesParSemaine.push({ label, series: weekSets.length })

      // RPE moyen sur Squat+Bench+DL uniquement
      const rpeValues = weekSets
        .filter(s => s.rpe != null && isMainLift((s.exercice || '').toLowerCase()))
        .map(s => s.rpe)
      const rpeAvg = rpeValues.length
        ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10
        : null
      rpeParSemaine.push({ label, rpe: rpeAvg, count: rpeValues.length })
    }

    // ── 8. Répartition mensuelle SBD vs Accessoires ──
    const setsMois = setsGraphique?.filter(s => new Date(s.created_at) >= debutMois) || []
    const sbdMois = setsMois.filter(s => isMainLift((s.exercice || '').toLowerCase())).length
    const accMois = setsMois.length - sbdMois
    const repartition = setsMois.length > 0
      ? { sbd: sbdMois, accessoires: accMois, total: setsMois.length }
      : null

    // ── 9. Progression e1RM par lift — 12 dernières semaines ──
    const debut12semaines = new Date()
    debut12semaines.setDate(debut12semaines.getDate() - 83) // ~12 semaines
    debut12semaines.setHours(0,0,0,0)

    const { data: setsSBD } = await supabase
      .from('seances_sets')
      .select('exercice, kg, reps, created_at')
      .eq('user_id', userId)
      .gte('created_at', debut12semaines.toISOString())
      .gt('kg', 0)
      .gt('reps', 0)

    function calc1RM(kg, reps) {
      if (reps === 1) return kg
      return Math.round((kg / (1.0278 - 0.0278 * reps)) * 10) / 10
    }

    // Définition des 3 lifts avec leurs mots-clés
    const liftDefs = [
      { key: 'squat',    label: 'Squat',    color: '#E63946', keywords: ['squat'],                                                           excludes: [] },
      { key: 'bench',    label: 'Bench',    color: '#8338EC', keywords: ['couché', 'couche', 'bench', 'développé couché'],                   excludes: ['décliné', 'incliné', 'militaire', 'arnold'] },
      { key: 'deadlift', label: 'Deadlift', color: '#3A86FF', keywords: ['soulevé', 'deadlift', 'rdl', 'terre'],                             excludes: [] },
    ]

    // Grouper par semaine ISO (lundi = début de semaine)
    function getWeekKey(dateStr) {
      const d = new Date(dateStr)
      const day = d.getDay() || 7 // dimanche = 7
      d.setDate(d.getDate() - day + 1) // ramener au lundi
      return d.toISOString().slice(0, 10)
    }

    const progressionSBD = {}
    for (const lift of liftDefs) {
      const weekMap = {}
      setsSBD?.forEach(s => {
        const nom = (s.exercice || '').toLowerCase()
        const matches = lift.keywords.some(k => nom.includes(k))
        const excluded = lift.excludes.some(e => nom.includes(e))
        if (!matches || excluded) return

        const e1rm = calc1RM(parseFloat(s.kg), parseInt(s.reps))
        if (!e1rm || e1rm <= 0) return

        const wk = getWeekKey(s.created_at)
        if (!weekMap[wk] || e1rm > weekMap[wk]) weekMap[wk] = e1rm
      })

      // Construire les 12 semaines glissantes
      const points = []
      const nowD = new Date()
      for (let i = 11; i >= 0; i--) {
        const monday = new Date(nowD)
        monday.setDate(monday.getDate() - monday.getDay() + 1 - i * 7)
        const wk = monday.toISOString().slice(0, 10)
        const weekNum = 12 - i
        const label = i === 0 ? 'S' : `S-${i}`
        points.push({ label, weekNum, e1rm: weekMap[wk] ?? null })
      }
      progressionSBD[lift.key] = { label: lift.label, color: lift.color, points }
    }

    return res.status(200).json({
      resume: {
        streak,
        volumeSemaine: Math.round(volumeSemaine),
        seancesMois,
      },
      prs: prs || [],
      seriesSemaine,
      seriesParSemaine,
      rpeParSemaine,
      repartition,
      progressionSBD,
    })

  } catch (err) {
    console.error('[stats GET]', err.message)
    return res.status(500).json({ error: 'Erreur serveur', detail: err.message })
  }
}
