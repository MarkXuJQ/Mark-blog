import { cn } from '../../utils/cn'
import {
  LifeClockDisplay,
  type LifeClockDisplayRow,
} from './LifeClockDisplay'
import { useLifeClockMetrics } from './useLifeClockMetrics'

export interface LifeSinceClockProps {
  className?: string
  compact?: boolean
  bare?: boolean
}

export function LifeSinceClock({
  className,
  compact = false,
  bare = false,
}: LifeSinceClockProps) {
  const metrics = useLifeClockMetrics()

  const rows: LifeClockDisplayRow[] = [
    { value: metrics.years, unit: 'YR' },
    { value: metrics.days, unit: 'DAY' },
    { value: metrics.hours, unit: 'HR' },
  ]

  return (
    <section
      className={cn(
        styles.root,
        !bare && styles.card,
        !bare && compact && styles.cardCompact,
        className
      )}
    >
      {!bare ? (
        <header className={styles.header}>
          <p className={styles.eyebrow}>Life clock</p>
          <h3 className={cn(styles.title, compact && styles.titleCompact)}>
            A running clock in years, days, and hours
          </h3>
        </header>
      ) : null}

      <div
        className={cn(
          styles.displayWrap,
          compact && styles.displayWrapCompact,
          bare && styles.displayWrapBare
        )}
      >
        <div className={cn(styles.displayShell, compact && styles.displayShellCompact)}>
          <LifeClockDisplay rows={rows} compact={compact} />
        </div>
      </div>
    </section>
  )
}

const styles = {
  root: 'w-full text-white',
  card: cn(
    'relative isolate overflow-hidden rounded-[28px] border border-emerald-300/10 bg-[#07100c] p-5 text-white shadow-[0_28px_80px_-40px_rgba(3,9,5,0.88)]',
    'dark:border-emerald-200/10 dark:bg-[#050b08]'
  ),
  cardCompact: 'p-4 sm:p-[1.125rem]',
  header: 'relative z-10',
  eyebrow:
    'font-[var(--font-pixel)] text-[0.7rem] tracking-[0.28em] text-emerald-300/76 uppercase',
  title: 'mt-3 text-base font-semibold leading-7 text-white sm:text-[1.05rem]',
  titleCompact: 'mt-2 text-[0.95rem] leading-6 sm:text-[1rem]',
  displayWrap: 'mt-5 flex w-full justify-center',
  displayWrapCompact: 'mt-4',
  displayWrapBare: 'mt-0 justify-start',
  displayShell:
    'w-full max-w-[30rem] [filter:drop-shadow(0_22px_38px_rgba(0,0,0,0.38))]',
  displayShellCompact: 'max-w-[26rem]',
}
