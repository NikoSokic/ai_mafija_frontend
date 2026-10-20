// Mala oznaka tima uz ime uloge ("tim mafije")
export default function TeamTag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-line px-[7px] py-px text-xs font-medium text-muted">
      {children}
    </span>
  )
}
