import { useId } from "react";
/** Original vector artwork; decorative, fictional landscape, no external assets. */
export function TropicalScene({ vertical = false }: { vertical?: boolean }) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      className="tropical-scene"
      viewBox={vertical ? "750 0 450 400" : "0 0 1200 400"}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x2="0" y2="1">
          <stop stopColor="#b9d6ed" />
          <stop offset=".56" stopColor="#ffc796" />
          <stop offset="1" stopColor="#f5a566" />
        </linearGradient>
        <g id={`${id}p`} fill="#06264c">
          <path d="M0 235 Q30 120 5 15 L14 12 Q42 115 14 235Z" />
          <path d="M10 18Q-58-40-78 16Q-30-3 10 18Q-42 0-60 60Q-20 27 10 18Q38-49 87-8Q44-6 10 18Q81-4 100 53Q48 20 10 18Q48 24 47 88Q24 49 10 18Q-17-48-49-34Q-4-15 10 18Z" />
        </g>
      </defs>
      <path fill={`url(#${id})`} d="M0 0h1200v400H0z" />
      <circle cx="862" cy="155" r="48" fill="#ffda70" />
      <circle cx="862" cy="155" r="29" fill="#ffe6ab" />
      <path
        fill="#7295bd"
        d="M0 233Q90 155 150 192L360 70Q390 52 422 71L545 133 666 89Q700 77 734 102L860 175 1050 68Q1080 54 1120 74L1200 104V400H0Z"
      />
      <path
        fill="#3c6697"
        d="M0 276 182 195 280 240 480 137Q510 118 544 145L729 236 924 136 1091 202 1200 160V400H0Z"
      />
      <path
        fill="#1f4879"
        d="M0 310 240 266 407 302 660 223 832 272 1018 207 1200 248V400H0Z"
      />
      <path
        fill="#082c56"
        d="M0 366 210 332 400 356 635 295 829 333 1020 279 1200 298V400H0Z"
      />
      <use href={`#${id}p`} transform="translate(1040 100) scale(1.2)" />
      <use href={`#${id}p`} transform="translate(940 161) scale(.65)" />
      <use href={`#${id}p`} transform="translate(1150 80) scale(1.6)" />
    </svg>
  );
}
