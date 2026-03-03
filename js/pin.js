import { APP_PIN } from './config.js'

const KEY = 'valcude_pin_ok'

/** Redirige a pin.html si el PIN no ha sido verificado en esta sesión */
export function requirePin() {
  if (!sessionStorage.getItem(KEY)) {
    location.replace('pin.html')
  }
}

/** Comprueba el PIN introducido */
export function verifyPin(entered) {
  return String(entered) === String(APP_PIN)
}

/** Marca la sesión como autenticada por PIN */
export function setPinOk() {
  sessionStorage.setItem(KEY, '1')
}
