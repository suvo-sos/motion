/**
 * The SVG MOTION brand mark: a play head with motion streaks, drawn in
 * `currentColor` so it works on the sidebar, the home hero, and the studio
 * header without per-spot styling. The favicon and PWA icons
 * (public/favicon.svg, public/icon-*.svg) draw the same geometry on an
 * app-coloured tile; keep them in sync when the mark changes.
 */
export function AppMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M10.6 6.35a1.35 1.35 0 0 1 2.04-1.15l7.55 4.5a1.6 1.6 0 0 1 0 2.74l-7.55 4.5a1.35 1.35 0 0 1-2.04-1.15z"
        fill="currentColor"
      />
      <path
        d="M2.6 8.7h4.6M2.6 12h3.2M2.6 15.3h4.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
