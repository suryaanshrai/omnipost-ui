import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/components/theme-provider"

/**
 * The bottom-center ink toast bar from App v2.dc.html (`bannerVisible` /
 * `showBanner()` in the source): fixed at the bottom, ink background, small
 * uppercase tracked-out page-colored text, auto-dismissing. Rather than
 * reimplement the design's own tiny setState/setTimeout queue, this keeps
 * `sonner` (already wired at every existing toast.* call site across the
 * app) and reskins it to match via `toastOptions` — same mechanism, same
 * call sites, new look.
 */
export default function Banner(props: ToasterProps) {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      duration={3200}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-center gap-3 bg-ink text-page px-6 py-4 text-[10px] font-bold uppercase tracking-[0.16em]",
          title: "text-page",
          description: "text-page/70 normal-case tracking-normal font-normal text-[11px]",
          actionButton: "bg-page text-ink px-3 py-2 text-[9px] tracking-[0.14em]",
          cancelButton: "text-page/60 text-[9px] tracking-[0.14em]",
        },
      }}
      {...props}
    />
  )
}
