'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Activity,
  Monitor,
  BarChart3,
  Shield,
  Zap,
  Database,
  Users,
} from 'lucide-react';

/* =====================  Types  ===================== */
type XY = { x: number; y: number };

type IconSize = 'sm' | 'md' | 'lg';

interface IconMeta {
  id: string;
  label: string;
  color: string; // main stroke color (HEX)
  glow: string;  // glow color (HEX)
  Component: any; // Lucide icon component
}

interface IconRuntime {
  id: string;
  label: string;
  color: string;
  glow: string;
  size: IconSize;
  angleDeg: number;
  radiusScale: number; // 0..1 of box size
  center: XY;          // computed later
  box: number;         // computed pixel box (width=height)
}

/* =====================  Icon definitions (base)  ===================== */
const ICONS_META: IconMeta[] = [
  { id: 'document',     label: 'Document',     color: '#60A5FA', glow: '#E5F1FF', Component: FileText },
  { id: 'tracking',     label: 'Tracking',     color: '#34D399', glow: '#CFFAEA', Component: Activity },
  { id: 'monitoring',   label: 'Monitoring',   color: '#C4B5FD', glow: '#EEE8FF', Component: Monitor },
  { id: 'analytics',    label: 'Analytics',    color: '#FDBA74', glow: '#FFE6CC', Component: BarChart3 },
  { id: 'security',     label: 'Security',     color: '#F87171', glow: '#FFD7D7', Component: Shield },
  { id: 'performance',  label: 'Performance',  color: '#FACC15', glow: '#FFF3B0', Component: Zap },
  { id: 'database',     label: 'Database',     color: '#67E8F9', glow: '#D6FBFF', Component: Database },
  { id: 'collaboration',label: 'Collaboration',color: '#A5B4FC', glow: '#E1E7FF', Component: Users },
];

/* =====================  Layout presets  ===================== */
/** ตำแหน่ง/ขนาดแบบไม่สมมาตร (desktop) */
const DESKTOP_LAYOUT: Array<{ id: string; size: IconSize; angle: number; r: number }> = [
  { id: 'document',     size: 'md', angle: -78,  r: 0.36 },
  { id: 'tracking',     size: 'sm', angle: -32,  r: 0.29 },
  { id: 'monitoring',   size: 'lg', angle:   8,  r: 0.40 },
  { id: 'analytics',    size: 'md', angle:  56,  r: 0.33 },
  { id: 'security',     size: 'lg', angle: 118,  r: 0.37 },
  { id: 'performance',  size: 'sm', angle: 168,  r: 0.31 },
  { id: 'database',     size: 'md', angle: -170, r: 0.38 },
  { id: 'collaboration',size: 'sm', angle: -124, r: 0.28 },
];

/** ตำแหน่ง/ขนาดแบบไม่สมมาตร (mobile) – กระชับขึ้นเล็กน้อยเพื่อกันชนขอบ */
const MOBILE_LAYOUT: Array<{ id: string; size: IconSize; angle: number; r: number }> = [
  { id: 'document',     size: 'md', angle: -85,  r: 0.34 },
  { id: 'tracking',     size: 'sm', angle: -24,  r: 0.26 },
  { id: 'monitoring',   size: 'lg', angle:   6,  r: 0.36 },
  { id: 'analytics',    size: 'md', angle:  46,  r: 0.30 },
  { id: 'security',     size: 'lg', angle: 112,  r: 0.34 },
  { id: 'performance',  size: 'sm', angle: 170,  r: 0.28 },
  { id: 'database',     size: 'md', angle: -174, r: 0.34 },
  { id: 'collaboration',size: 'sm', angle: -132, r: 0.26 },
];

/* =====================  Component  ===================== */
const NetworkLogoHub: React.FC = () => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // วัดขนาดจริงของกล่อง เพื่อให้ responsive 100% (หลีกเลี่ยงการใช้ window ตรง ๆ)
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState(384); // fallback = md:w-96

  useEffect(() => {
    const measure = () => {
      const w = boxRef.current?.getBoundingClientRect().width ?? 384;
      setBoxSize(Math.round(w));
    };
    measure();
    setMounted(true);
    
    // Throttle resize events for better performance
    let timeoutId: NodeJS.Timeout;
    const throttledMeasure = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(measure, 100);
    };
    
    window.addEventListener('resize', throttledMeasure);
    return () => {
      window.removeEventListener('resize', throttledMeasure);
      clearTimeout(timeoutId);
    };
  }, []);

  const center = useMemo<XY>(() => ({ x: boxSize / 2, y: boxSize / 2 }), [boxSize]);
  const isMobile = boxSize < 360;

  // ขนาดกล่องของไอคอนแบบตายตัวตาม breakpoint
  const sizePx = useMemo(
    () =>
      isMobile
        ? ({ sm: 46, md: 54, lg: 62 } as Record<IconSize, number>)
        : ({ sm: 54, md: 64, lg: 74 } as Record<IconSize, number>),
    [isMobile]
  );

  // สร้าง runtime icons พร้อมตำแหน่งจริง
  const icons: IconRuntime[] = useMemo(() => {
    const layout = isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT;
    const map = new Map(layout.map((l) => [l.id, l]));
    return ICONS_META.map((meta) => {
      const cfg = map.get(meta.id)!;
      const r = boxSize * cfg.r;
      const rad = (cfg.angle * Math.PI) / 180;
      const c: XY = { x: center.x + r * Math.cos(rad), y: center.y + r * Math.sin(rad) };
      return {
        id: meta.id,
        label: meta.label,
        color: meta.color,
        glow: meta.glow,
        size: cfg.size,
        angleDeg: cfg.angle,
        radiusScale: cfg.r,
        center: c,
        box: sizePx[cfg.size],
      };
    });
  }, [boxSize, isMobile, center.x, center.y, sizePx]);

  /* ========== Path Builder: Manhattan path touches rectangle edge exactly ========== */
  /**
   * สร้าง path แบบออกจากศูนย์กลาง -> เลี้ยว -> เข้าด้านของกล่องไอคอนตรงกลางด้าน (ไม่เข้ามุม) และ
   * สิ้นสุดที่พิกัด "ขอบด้านนอก" ของกล่องนั้นพอดี (ไม่มีช่องว่าง)
   */
  const makePathToBox = (target: IconRuntime): string => {
    const cx = center.x;
    const cy = center.y;

    // พอร์ตของกรอบไอคอน (ด้านที่จะเข้า) และจุด pivot
    const dx = target.center.x - cx;
    const dy = target.center.y - cy;
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;

    // ออกจาก hub ตามแกนที่ไกลกว่าเล็กน้อย เพื่อให้ดูเป็น "สายหลัก"
    const bus = Math.min(Math.max(boxSize * 0.08, 18), 36);
    const goXFirst = Math.abs(dx) >= Math.abs(dy);

    // ค่าครึ่งหนึ่งของกรอบไอคอน
    const half = target.box / 2;

    // พอร์ต = กึ่งกลางด้านของกล่อง (ชนขอบพอดี)
    const port: XY = { x: target.center.x, y: target.center.y };
    let p = `M ${cx} ${cy} `;

    if (goXFirst) {
      // สุดท้ายวิ่งแนวนอน -> เข้าด้านซ้าย/ขวา
      const x1 = cx + signX * bus;
      const portX = signX > 0 ? target.center.x - half : target.center.x + half; // แตะขอบซ้าย/ขวาตามทิศ
      const portY = target.center.y; // กลางด้าน
      p += `L ${x1} ${cy} L ${x1} ${portY} L ${portX} ${portY}`;
    } else {
      // สุดท้ายวิ่งแนวตั้ง -> เข้าด้านบน/ล่าง
      const y1 = cy + signY * bus;
      const portY = signY > 0 ? target.center.y - half : target.center.y + half; // แตะขอบบน/ล่างตามทิศ
      const portX = target.center.x; // กลางด้าน
      p += `L ${cx} ${y1} L ${portX} ${y1} L ${portX} ${portY}`;
    }

    return p;
  };

  return (
    <div className="flex justify-center mb-8 relative">
      <div className="relative">
        <div ref={boxRef} className="relative w-80 h-80 md:w-96 md:h-96">
          {/* ==================== SVG Lines ==================== */}
          <svg
            className="absolute inset-0"
            width="100%"
            height="100%"
            viewBox={`0 0 ${boxSize} ${boxSize}`}
            style={{ overflow: 'visible', pointerEvents: 'none' }}
          >
            <defs>
              {/* Glow for tracks */}
              <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Spark glow */}
              <filter id="spark-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.8" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {icons.map((ic, idx) => {
              const d = makePathToBox(ic);
              // Simplified animation timing for better performance
              const dashDur = 2 + (idx % 3) * 0.5;
              const begin = `${(idx * 0.2).toFixed(2)}s`;

              return (
                <g key={ic.id}>
                  {/* Base trace */}
                  <path
                    d={d}
                    stroke="rgba(148,163,184,0.25)"
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                  {/* Electric current - simplified animation */}
                  <path
                    id={`path-${ic.id}`}
                    d={d}
                    stroke={hovered === ic.id ? ic.glow : ic.color}
                    strokeWidth={hovered === ic.id ? 2.6 : 2.2}
                    fill="none"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    style={{
                      filter: 'url(#soft-glow)',
                      mixBlendMode: 'screen',
                      strokeDasharray: '20 200',
                      animation: `dash-move ${dashDur}s linear infinite`,
                      opacity: hovered === ic.id ? 1 : 0.8,
                    }}
                  />
                  {/* Single spark for better performance */}
                  <circle 
                    r={hovered === ic.id ? 2.5 : 2} 
                    fill={ic.glow}
                    style={{ filter: 'url(#spark-glow)', mixBlendMode: 'screen' }}
                  >
                    <animateMotion
                      dur={`${dashDur + 0.5}s`}
                      begin={begin}
                      repeatCount="indefinite"
                      rotate="auto"
                    >
                      <mpath href={`#path-${ic.id}`} xlinkHref={`#path-${ic.id}`} />
                    </animateMotion>
                  </circle>
                </g>
              );
            })}

            {/* Center dot */}
            <circle cx={center.x} cy={center.y} r={2.6} fill="rgba(148,163,184,0.55)" />
          </svg>

          {/* ==================== Center Electric Logo ==================== */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="relative">
              {/* Outer aura */}
              <div
                className="absolute inset-0 -z-10 rounded-full blur-2xl"
                style={{
                  width: isMobile ? 96 : 112,
                  height: isMobile ? 96 : 112,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background:
                    'radial-gradient(closest-side, rgba(255,255,255,0.75), rgba(255,255,255,0.12) 60%, transparent 70%)',
                }}
              />
              {/* Glass ring */}
              <div
                className="absolute -z-10 rounded-full border border-white/25 backdrop-blur-md"
                style={{
                  width: (isMobile ? 96 : 112) + 8,
                  height: (isMobile ? 96 : 112) + 8,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background:
                    'radial-gradient(closest-side, rgba(255,255,255,0.35), rgba(255,255,255,0.12) 55%, rgba(255,255,255,0.06) 70%, transparent 80%)',
                  boxShadow: '0 0 40px rgba(255,255,255,0.35)',
                }}
              />
              {/* Electric ticket logo (white electricity inside) */}
              <ElectricTicketLogo size={isMobile ? 84 : 96} />
            </div>
          </div>

          {/* ==================== Icons ==================== */}
          <div className="absolute inset-0 pointer-events-none">
            {icons.map((ic, i) => {
              const Icon = ICONS_META.find((m) => m.id === ic.id)!.Component;
              return (
                <div
                  key={ic.id}
                  className={`absolute pointer-events-auto cursor-pointer transition-all duration-500 ${
                    mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}
                  style={{
                    left: ic.center.x,
                    top: ic.center.y,
                    transform: 'translate(-50%, -50%)',
                    transitionDelay: `${i * 80}ms`,
                  }}
                  onMouseEnter={() => setHovered(ic.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    className="relative rounded-2xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 group/icon"
                    style={{
                      width: ic.box,
                      height: ic.box,
                      display: 'grid',
                      placeItems: 'center',
                      backdropFilter: 'blur(8px)',
                      transform: hovered === ic.id ? 'scale(1.06)' : 'scale(1)',
                    }}
                  >
                    {/* glow bg on hover */}
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300 blur"
                      style={{ background: `${ic.color}22` }}
                    />
                    <Icon
                      size={Math.round(ic.box * 0.42)}
                      style={{ color: hovered === ic.id ? ic.glow : ic.color, zIndex: 1 }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded-md opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                      {ic.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* animation for moving dash */}
        <style jsx global>{`
          @keyframes dash-move {
            0% {
              stroke-dashoffset: 0;
            }
            100% {
              stroke-dashoffset: -260;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

/* =====================  Electric Ticket Logo  ===================== */
/**
 * โลโก้จาก <LOGO> ที่ให้มา แต่ทำให้ "ภายในเป็นไฟสีขาว" ด้วย fractal noise + inner glow
 * มีฟลิคเกอร์เบา ๆ เหมือนไฟฟ้าอยู่ข้างใน
 */
const ElectricTicketLogo: React.FC<{ size?: number }> = ({ size = 96 }) => {
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 256 256"
      role="img"
      aria-label="IT Ticket Management Symbolic Logo"
      style={{
        display: 'block',
        filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.75)) drop-shadow(0 0 36px rgba(255,255,255,0.35))',
        mixBlendMode: 'screen',
      }}
    >
      <title>IT Ticket Management Symbolic Logo</title>
      <defs>
        {/* ใช้พื้นขาวเป็นหลัก */}
        <linearGradient id="white-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>

        {/* Simplified electricity effect for better performance */}
        <filter id="electricity" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="7" result="noise">
            <animate attributeName="baseFrequency" values="0.8;1.0;0.8" dur="3s" repeatCount="indefinite" />
          </feTurbulence>
          <feColorMatrix
            in="noise"
            type="matrix"
            values="
              0 0 0 0 1
              0 0 0 0 1
              0 0 0 0 1
              0 0 0 1 0"
            result="whiteNoise"
          />
          <feGaussianBlur in="whiteNoise" stdDeviation="0.4" result="soft" />
          <feBlend in="SourceGraphic" in2="soft" mode="screen" />
        </filter>

        {/* Mask จาก LOGO เดิม */}
        <mask id="ticketMask" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
          <rect x="0" y="0" width="256" height="256" fill="black" />
          <rect x="48" y="48" width="160" height="160" rx="36" ry="36" fill="white" />
          <circle cx="48" cy="128" r="24" fill="black" />
          <circle cx="208" cy="128" r="24" fill="black" />
          <path
            d="M92 134 L116 158 L168 104"
            fill="none"
            stroke="black"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>

      {/* พื้นขาวด้านใน + electricity filter */}
      <rect x="0" y="0" width="256" height="256" fill="url(#white-core)" mask="url(#ticketMask)" filter="url(#electricity)" />
      {/* ขอบในเบา ๆ เพื่อให้เด่นจากพื้นหลัง */}
      <rect
        x="48"
        y="48"
        width="160"
        height="160"
        rx="36"
        ry="36"
        fill="none"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="2"
        mask="url(#ticketMask)"
      />
    </svg>
  );
};

export default NetworkLogoHub;
