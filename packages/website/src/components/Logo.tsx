interface LogoProps {
  className?: string;
}

export default function Logo({ className = "w-12 h-12" }: LogoProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Main S shape with gradient */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="scarcityGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ffd60a" />
            <stop offset="25%" stopColor="#ffb92e" />
            <stop offset="75%" stopColor="#ff9500" />
            <stop offset="100%" stopColor="#ff6b6b" />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* S Shape */}
        <path
          d="M70 25 C80 25, 85 30, 85 40 C85 50, 75 55, 65 55 L35 55 C25 55, 15 60, 15 70 C15 80, 25 85, 35 85 L65 85"
          stroke="url(#scarcityGradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {/* Network/chain overlay */}
        <g
          stroke="url(#scarcityGradient)"
          strokeWidth="1.5"
          fill="url(#scarcityGradient)"
          opacity="0.6"
        >
          {/* Connection nodes */}
          <circle cx="35" cy="20" r="2" />
          <circle cx="50" cy="15" r="1.5" />
          <circle cx="65" cy="25" r="2" />
          <circle cx="80" cy="35" r="1.5" />
          <circle cx="70" cy="50" r="2" />
          <circle cx="45" cy="60" r="1.5" />
          <circle cx="25" cy="70" r="2" />
          <circle cx="40" cy="85" r="1.5" />

          {/* Connection lines */}
          <line
            x1="35"
            y1="20"
            x2="50"
            y2="15"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <line
            x1="50"
            y1="15"
            x2="65"
            y2="25"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <line
            x1="65"
            y1="25"
            x2="80"
            y2="35"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <line
            x1="80"
            y1="35"
            x2="70"
            y2="50"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <line
            x1="70"
            y1="50"
            x2="45"
            y2="60"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <line
            x1="45"
            y1="60"
            x2="25"
            y2="70"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <line
            x1="25"
            y1="70"
            x2="40"
            y2="85"
            strokeWidth="0.8"
            opacity="0.4"
          />

          {/* Cross connections */}
          <line
            x1="35"
            y1="20"
            x2="70"
            y2="50"
            strokeWidth="0.5"
            opacity="0.2"
          />
          <line
            x1="80"
            y1="35"
            x2="45"
            y2="60"
            strokeWidth="0.5"
            opacity="0.2"
          />
          <line
            x1="65"
            y1="25"
            x2="25"
            y2="70"
            strokeWidth="0.5"
            opacity="0.2"
          />
        </g>
      </svg>
    </div>
  );
}
