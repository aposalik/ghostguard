export function GhostBloom() {
  return (
    <div className="ghost-bloom" aria-hidden="true">
      <div className="ghost-bloom-orbit orbit-one" />
      <div className="ghost-bloom-orbit orbit-two" />
      <svg viewBox="0 0 560 560" role="presentation">
        <defs>
          <linearGradient id="shieldGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6ffd9" />
            <stop offset="1" stopColor="#c5ff37" />
          </linearGradient>
          <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="18" stdDeviation="12" floodColor="#0f2819" floodOpacity=".3" />
          </filter>
        </defs>

        <g className="bloom-stem">
          <path d="M280 475 C278 410 289 356 280 298" fill="none" stroke="#183b22" strokeWidth="13" strokeLinecap="round" />
          <path d="M278 398 C224 366 188 366 148 387 C192 421 233 427 279 416Z" fill="#8cbf18" stroke="#183b22" strokeWidth="6" />
          <path d="M284 356 C329 316 373 311 414 331 C385 372 344 384 282 377Z" fill="#ff865f" stroke="#183b22" strokeWidth="6" />
          <path d="M278 448 C239 430 206 433 177 455 C213 478 243 481 281 466Z" fill="#8374ff" stroke="#183b22" strokeWidth="6" />
        </g>

        <g className="bloom-receipts" filter="url(#softShadow)">
          <g transform="translate(91 121) rotate(-12)">
            <rect width="150" height="116" rx="8" fill="#f5f6dd" stroke="#183b22" strokeWidth="6" />
            <path d="M20 26H128M20 46H104M20 66H122" stroke="#183b22" strokeWidth="6" strokeLinecap="round" opacity=".55" />
            <circle cx="119" cy="91" r="12" fill="#ff6d00" />
          </g>
          <g transform="translate(338 112) rotate(10)">
            <rect width="142" height="111" rx="8" fill="#cdb5ff" stroke="#183b22" strokeWidth="6" />
            <path d="M19 25H118M19 47H94M19 69H112" stroke="#183b22" strokeWidth="6" strokeLinecap="round" opacity=".55" />
            <path d="M102 86l9 9 17-20" fill="none" stroke="#183b22" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        <g className="bloom-core" filter="url(#softShadow)">
          <path d="M280 92L391 137V239C391 315 345 374 280 397C215 374 169 315 169 239V137L280 92Z" fill="url(#shieldGlow)" stroke="#183b22" strokeWidth="9" strokeLinejoin="round" />
          <path d="M226 211C226 169 250 145 280 145C310 145 334 169 334 211V288C322 278 311 278 300 292C287 276 274 276 260 292C249 278 238 278 226 288V211Z" fill="#183b22" />
          <ellipse cx="260" cy="216" rx="12" ry="17" fill="#c5ff37" />
          <ellipse cx="301" cy="216" rx="12" ry="17" fill="#c5ff37" />
          <path d="M255 252C270 263 291 263 306 252" fill="none" stroke="#c5ff37" strokeWidth="7" strokeLinecap="round" />
          <circle cx="280" cy="117" r="17" fill="#ff6d00" stroke="#183b22" strokeWidth="6" />
        </g>

        <g className="bloom-nodes">
          <circle cx="89" cy="283" r="14" fill="#8374ff" stroke="#183b22" strokeWidth="5" />
          <circle cx="461" cy="278" r="14" fill="#ff6d00" stroke="#183b22" strokeWidth="5" />
          <path d="M103 283H160M400 278H447" stroke="#183b22" strokeWidth="5" strokeDasharray="8 9" />
          <path d="M78 256L61 240M473 251L490 234" stroke="#183b22" strokeWidth="5" strokeLinecap="round" />
        </g>

        <g className="bloom-pot">
          <path d="M212 463H348L331 531H229L212 463Z" fill="#183b22" />
          <path d="M199 454H361V480H199Z" rx="4" fill="#ff6d00" stroke="#183b22" strokeWidth="6" />
          <path d="M246 499H314" stroke="#c5ff37" strokeWidth="8" strokeLinecap="round" opacity=".7" />
        </g>
      </svg>
      <div className="bloom-stamp">
        <span>RECEIPT</span>
        <strong>≠</strong>
        <span>TRUTH</span>
      </div>
    </div>
  )
}
