import { useEffect, useState } from "react"

/** A search field that reports its value 300ms after typing stops. */
export default function SearchBox({ onSearch, label }: { onSearch: (q: string) => void; label: string }) {
  const [value, setValue] = useState("")
  useEffect(() => {
    const t = window.setTimeout(() => onSearch(value.trim()), 300)
    return () => window.clearTimeout(t)
  }, [value, onSearch])
  return (
    <input
      type="search"
      aria-label={label}
      placeholder="Search posts…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="mt-6 w-full max-w-[360px] border-0 border-b border-hair bg-transparent py-2 text-[14px] text-ink placeholder:text-ink-55 focus:border-rust"
    />
  )
}
