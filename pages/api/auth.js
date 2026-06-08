// pages/api/auth.js
import { setCorsHeaders } from '../../lib/whopAuth'

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const token = req.headers['x-whop-user-token'] || req.body?.token

  // Pas de token → userId basé sur un identifiant stable côté client
  if (!token) {
    return res.status(200).json({ 
      userId: 'guest_user',
      guest: true 
    })
  }

  try {
    const { verifyWhopToken } = await import('../../lib/whopAuth')
    const userId = await verifyWhopToken(req.headers)
    if (!userId) return res.status(200).json({ userId: 'guest_user', guest: true })
    return res.status(200).json({ userId })
  } catch (e) {
    return res.status(200).json({ userId: 'guest_user', guest: true })
  }
}
