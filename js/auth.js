import { getClient } from './db.js'

/** Inicia sesión con email y contraseña */
export async function signIn(email, password) {
  const supabase = getClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/** Cierra sesión */
export async function signOut() {
  const supabase = getClient()
  await supabase.auth.signOut()
}

/** Devuelve la sesión activa, o null si no hay */
export async function getSession() {
  const supabase = getClient()
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** Escucha cambios de estado de autenticación */
export function onAuthStateChange(callback) {
  const supabase = getClient()
  return supabase.auth.onAuthStateChange((_event, session) => callback(session))
}

/**
 * Redirige a import.html si no hay sesión activa.
 * Úsala en páginas protegidas.
 */
export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    window.location.href = '/import.html'
    return false
  }
  return true
}

/** Muestra/oculta el botón de importar según sesión */
export async function updateNavAuth() {
  const session = await getSession()
  const link = document.getElementById('nav-import')
  if (link) link.style.display = session ? 'inline-flex' : 'none'
}
