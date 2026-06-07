// pages/api/auth.js
// Valide le token Whop et retourne le userId
// Appelé par le front au chargement de l'app

import { verifyWhopToken, setCorsHeaders } from '../../lib/whopAuth'

export default async function handler(req, res) {
  setCorsHeaders(res)

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const token = req.headers['x-whop-user-token'] || req.body?.token

  if (!token) {
    // Mode développement sans Whop : retourne un userId de test
    if (process.env.NODE_ENV === 'development') {
      return res.status(200).json({ userId: 'dev_user_local', dev: true })
    }
    return res.status(401).json({ error: 'Token manquant' })
  }

  const userId = await verifyWhopToken(token)

  if (!userId) {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }

  return res.status(200).json({ userId })
}
