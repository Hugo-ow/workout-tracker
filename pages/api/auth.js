// pages/api/auth.js
import { setCorsHeaders } from '../../lib/whopAuth'

export default async function handler(req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const token = req.headers['x-whop-user-token'] || req.body?.token

  // Si pas de token — retourne un userId de dev au lieu de 401
  // L'app fonctionne mais sans sauvegarde serveur
  if (!token) {
    return res.status(200).json({ 
      userId: 'guest_' + Math.random().toString(36).slice(2, 9),
      guest: true 
    })
  }

  try {
    const { verifyWhopToken } = await import('../../lib/whopAuth')
    const userId = await verifyWhopToken(req.headers)

    if (!userId) {
      return res.status(200).json({ 
        userId: 'guest_' + Math.random().toString(36).slice(2, 9),
        guest: true 
      })
    }

    return res.status(200).json({ userId })

  } catch (e) {
    console.error('[auth]', e.message)
    return res.status(200).json({ 
      userId: 'guest_' + Math.random().toString(36).slice(2, 9),
      guest: true 
    })
  }
}
