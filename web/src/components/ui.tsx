import type { ReactNode } from 'react';

/** Shared status treatments. Colour never carries meaning on its own here:
 *  every pill and badge also renders a glyph and a text label. */

export type Tone = 'ok' | 'warn' | 'bad' | 'idle';

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok border-ok/25',
  warn: 'bg-warn-soft text-warn border-warn/25',
  bad: 'bg-bad-soft text-bad border-bad/25',
  idle: 'bg-idle-soft text-idle border-line-strong',
};

interface IconProps {
  className?: string;
}

export function CheckGlyph({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={'h-3.5 w-3.5 ' + className}>
      <path
        d="M3 8.5l3.2 3.2L13 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AlertGlyph({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={'h-3.5 w-3.5 ' + className}>
      <path
        d="M8 1.8L15 14H1L8 1.8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function BlockGlyph({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={'h-3.5 w-3.5 ' + className}>
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.8 3.8l8.4 8.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function MissingGlyph({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={'h-3.5 w-3.5 ' + className}>
      <rect
        x="2.2"
        y="2.2"
        width="11.6"
        height="11.6"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="3 2.4"
      />
    </svg>
  );
}

export function IdleGlyph({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={'h-3.5 w-3.5 ' + className}>
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 8h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SourceGlyph({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={'h-3.5 w-3.5 ' + className}>
      <path
        d="M2.5 4.5h11v8h-11z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M2.5 7.2h11M6.4 7.2v5.3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function ChevronGlyph({ open, className = '' }: IconProps & { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={'h-3.5 w-3.5 transition-transform ' + (open ? 'rotate-90 ' : '') + className}
    >
      <path
        d="M6 3.5L10.5 8 6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Pill({
  tone,
  glyph,
  children,
}: {
  tone: Tone;
  glyph: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ' +
        TONE_CLASS[tone]
      }
    >
      {glyph}
      {children}
    </span>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  bodyClassName = '',
  className = '',
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={
        'flex min-h-0 flex-col rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)] ' +
        className
      }
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-3.5 py-2.5">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[11.5px] text-ink-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div className={'min-h-0 flex-1 ' + bodyClassName}>{children}</div>
    </section>
  );
}
