export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

/**
 * Crée les headers pour les requêtes API avec le token JWT
 * Compatible avec Safari iOS qui bloque les cookies cross-site
 */
export function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Récupérer le token JWT depuis localStorage
  const token = localStorage.getItem('nonotalk_token');
  
  // Ajouter le token JWT si disponible (pour Safari iOS)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Crée les options de fetch avec authentification
 * @param {Object} options - Options fetch personnalisées
 * @returns {Object} Options fetch avec headers d'authentification
 */
export function getAuthFetchOptions(options = {}) {
  const token = localStorage.getItem('nonotalk_token');
  
  const authOptions = {
    ...options,
    credentials: 'include',  // Garder pour compatibilité desktop
    headers: {
      'Content-Type': 'application/json',  // Toujours inclure pour JSON
      ...options.headers
    }
  };
  
  // Ajouter le token JWT si disponible (pour Safari iOS)
  if (token) {
    authOptions.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return authOptions;
}
