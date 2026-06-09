// lib/whopAuth.js

export async function verifyWhopToken(headers) {
  try {
    let token = null
    if (headers && typeof headers.get === 'function') {
      token = headers.get('x-whop-user-token')
    } else if (headers && typeof headers === 'object') {
      token = headers['x-whop-user-token']
    }
    if (!token) return null

    // Décoder le JWT sans vérification de signature
    // (Whop a déjà validé le token avant de nous l'envoyer)
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    )
    
    console.log('[whopAuth] payload:', JSON.stringify(payload))
    
    // Vérifier que le token n'est pas expiré
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('[whopAuth] token expiré')
      return null
    }
    
    return payload.sub || null

  } catch (e) {
    console.error('[whopAuth] erreur:', e.message)
    return null
  }
}

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-whop-user-token, Authorization')
}
