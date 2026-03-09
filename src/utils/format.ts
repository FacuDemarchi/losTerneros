export function formatMoney(value: number) {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(timestamp: number) {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return 'Fecha inválida'
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return 'Fecha inválida'
  }
}

export function formatTime(timestamp: number) {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '--:--'
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '--:--'
  }
}
