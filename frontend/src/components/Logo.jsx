import { BRAND } from '../config'

export default function Logo({ size = 36 }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/icon-192.png" alt="" width={size} height={size} className="rounded-xl" />
      <span className="font-display text-xl font-extrabold italic tracking-tight text-white">
        Bet<span className="text-brand">lyze</span>
      </span>
      <span className="sr-only">{BRAND.name}</span>
    </span>
  )
}
