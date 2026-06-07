export function broadcast(key) {
  window.dispatchEvent(new CustomEvent(`mm:${key}`))
}

export function listenFor(key, callback) {
  const event = `mm:${key}`
  window.addEventListener(event, callback)
  return () => window.removeEventListener(event, callback)
}
