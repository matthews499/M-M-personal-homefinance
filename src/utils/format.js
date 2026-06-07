const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export function currency(amount) {
  return gbp.format(Number(amount) || 0)
}

export function greeting(name) {
  const h = new Date().getHours()
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${time}, ${name}`
}
