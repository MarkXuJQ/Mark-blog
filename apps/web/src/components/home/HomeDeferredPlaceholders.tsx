import type { RefObject } from 'react'

const HOME_WIDGET_STACK_PLACEHOLDER_MIN_HEIGHT = '320svh'

export function HomeWidgetStackPlaceholder({
  placeholderRef,
}: {
  placeholderRef?: RefObject<HTMLElement | null>
}) {
  return (
    <section
      ref={placeholderRef}
      aria-hidden="true"
      data-home-snap="widget"
      className="relative isolate z-20 snap-start"
      style={{
        minHeight: HOME_WIDGET_STACK_PLACEHOLDER_MIN_HEIGHT,
      }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="relative h-full">
          <div className="absolute inset-[-14px] z-0 overflow-hidden bg-[linear-gradient(180deg,#050913_0%,#060c17_24%,#07101c_56%,#091522_100%)]">
            <div className="pointer-events-none absolute top-[8rem] left-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(56,189,248,0.05)_34%,rgba(56,189,248,0)_72%)] blur-3xl" />
            <div className="pointer-events-none absolute right-[-8rem] bottom-[4rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.14)_0%,rgba(251,191,36,0.04)_30%,rgba(251,191,36,0)_74%)] blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_0px,transparent_1px)] [background-size:22px_22px] opacity-30" />
          </div>

          <div className="relative z-10 h-full">
            <div className="mx-auto h-full w-full max-w-[96rem] overflow-hidden px-4 sm:px-6 lg:px-8">
              <div className="relative min-h-full pt-[14svh] pb-[20svh] sm:pt-[16svh] sm:pb-[22svh] lg:pt-[18svh] lg:pb-[24svh]">
                <div className="relative w-full">
                  <div className="pointer-events-none absolute top-1/2 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.12)_0%,rgba(56,189,248,0.05)_34%,rgba(56,189,248,0)_72%)] blur-3xl" />
                  <div className="pointer-events-none absolute top-1/2 left-1/2 h-[min(88vw,48rem)] w-[min(88vw,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/7" />
                  <div className="pointer-events-none absolute top-1/2 left-1/2 h-[min(68vw,36rem)] w-[min(68vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function HomeRadarPlaceholder({
  placeholderRef,
}: {
  placeholderRef?: RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={placeholderRef}
      aria-hidden="true"
      data-home-snap="radar"
      className="relative isolate z-[30] min-h-[100svh] overflow-hidden"
      style={{ backgroundColor: 'var(--page-background)' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(6,182,212,0.1)_0%,rgba(6,182,212,0.04)_26%,rgba(6,182,212,0)_58%),radial-gradient(circle_at_80%_72%,rgba(249,115,22,0.08)_0%,rgba(249,115,22,0.03)_28%,rgba(249,115,22,0)_56%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(148,163,184,0.05)_0px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_0px,transparent_1px)] [background-size:24px_24px]" />
    </div>
  )
}
