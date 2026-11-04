

/** Monday 00:00 local of the week containing `d`. */
export function weekStart(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const offset = (start.getDay() + 6) % 7 // 0 = Monday
  start.setDate(start.getDate() - offset)
  return start
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}
