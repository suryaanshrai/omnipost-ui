import { useEffect, useRef, useState } from "react"

/**
 * A search field that reports its value 300ms after typing stops, inside a
 * <search> landmark so it can be found from a screen reader's landmarks.
 */
export default function SearchBox({
  onSearch,
  label,
  placeholder = "Search…",
}: {
  onSearch: (q: string) => void
  label: string
  placeholder?: string
}) {
  const [value, setValue] = useState("")
  const reported = useRef("")
  useEffect(() => {
    const q = value.trim()
    if (q === reported.current) return
    const t = window.setTimeout(() => {
      reported.current = q
      onSearch(q)
    }, 300)
    return () => window.clearTimeout(t)
  }, [value, onSearch])
  return (
    <search className="mt-6 block w-full max-w-[360px]">
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border-0 border-b border-ink/50 bg-transparent py-2 text-[14px] text-ink placeholder:text-ink-55 focus:border-rust"
      />
    </search>
  )
}
