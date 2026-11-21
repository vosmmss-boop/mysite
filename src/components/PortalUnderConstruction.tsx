import {CyberScannerBackground} from './CyberScannerBackground';

export interface PortalUnderConstructionProps {
  /** Main portal heading (rendered uppercase) */
  heading?: string;
  /** Status badge label */
  statusText?: string;
  /** Subtitle beneath the status badge */
  subtitle?: string;
  /** Optional wrapper classes */
  className?: string;
}

export function PortalUnderConstruction({
  heading = 'Amit Joshi Portal',
  statusText = 'UNDER CONSTRUCTION',
  subtitle = 'WILL BE LIVE SOON',
  className = '',
}: PortalUnderConstructionProps) {
  return (
    <main
      className={`relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#030608] px-4 py-14 sm:px-8 sm:py-20 ${className}`}
    >
      {/* Continuous futuristic background cyber scanner with full-viewport cursor reactivity */}
      <CyberScannerBackground />

      {/* Central HUD Composition Frame */}
      <section
        aria-label={heading}
        className="relative z-10 flex w-full max-w-4xl flex-col items-center justify-center px-6 py-14 text-center sm:px-14 sm:py-20 md:px-20 md:py-24"
      >
        {/* Four minimal cyan HUD corner brackets */}
        <span
          aria-hidden="true"
          className="portal-bracket-glow pointer-events-none absolute top-0 left-0 h-6 w-6 border-t-[1.5px] border-l-[1.5px] border-cyan-400/80 sm:h-8 sm:w-8 md:h-9 md:w-9"
        />
        <span
          aria-hidden="true"
          className="portal-bracket-glow pointer-events-none absolute top-0 right-0 h-6 w-6 border-t-[1.5px] border-r-[1.5px] border-cyan-400/80 sm:h-8 sm:w-8 md:h-9 md:w-9"
        />
        <span
          aria-hidden="true"
          className="portal-bracket-glow pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-[1.5px] border-l-[1.5px] border-cyan-400/80 sm:h-8 sm:w-8 md:h-9 md:w-9"
        />
        <span
          aria-hidden="true"
          className="portal-bracket-glow pointer-events-none absolute right-0 bottom-0 h-6 w-6 border-r-[1.5px] border-b-[1.5px] border-cyan-400/80 sm:h-8 sm:w-8 md:h-9 md:w-9"
        />

        {/* Main heading: subtle CSS keyframe glitch effect on hover */}
        <h1
          data-text={heading}
          className="font-display portal-heading-glow portal-glitch max-w-full text-[clamp(1.65rem,5vw,3.75rem)] leading-[1.15] font-bold tracking-[0.14em] text-balance text-white uppercase sm:tracking-[0.2em] md:tracking-[0.24em]"
        >
          {heading}
        </h1>

        {/* Status badge: rounded pill with cyan border and subtle glow */}
        <div
          role="status"
          className="portal-badge-glow animate-pulse-subtle mt-6 inline-flex max-w-full items-center justify-center rounded-full border border-cyan-400/60 bg-cyan-950/30 px-5 py-2 sm:mt-8 sm:px-7 sm:py-2.5"
        >
          <span className="font-display text-[11px] font-semibold tracking-[0.24em] whitespace-nowrap text-cyan-300 uppercase sm:text-xs sm:tracking-[0.32em]">
            {statusText}
          </span>
        </div>

        {/* Subtitle: uppercase, muted grey, widely spaced */}
        <p className="font-display mt-6 max-w-2xl text-[11px] leading-relaxed font-medium tracking-[0.2em] text-slate-400 uppercase sm:mt-8 sm:text-xs sm:tracking-[0.32em] md:text-sm">
          {subtitle}
        </p>

        {/* Thin cyan decorative line beneath subtitle */}
        <div
          aria-hidden="true"
          className="portal-line-glow mt-6 h-px w-24 bg-gradient-to-r from-transparent via-cyan-400/85 to-transparent sm:mt-7 sm:w-36"
        />
      </section>
    </main>
  );
}
