'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
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

type XY = { x: number; y: number };

interface NetworkIcon {
  id: string;
  icon: React.ReactNode;
  angleDeg: number; // ตำแหน่งรอบวงเป็นองศา
  label: string;
  color: string;    // สีหลักของเส้น/ไอคอน (HEX)
  glow: string;     // สี Glow (HEX)
}

const ICONS_DEF: Omit<NetworkIcon, 'angleDeg'>[] = [
  { id: 'document',    icon: <FileText size={24} />, label: 'Document',    color: '#60A5FA', glow: '#93C5FD' },
  { id: 'tracking',    icon: <Activity size={24} />, label: 'Tracking',    color: '#34D399', glow: '#6EE7B7' },
  { id: 'monitoring',  icon: <Monitor size={24} />,  label: 'Monitoring',  color: '#C4B5FD', glow: '#DDD6FE' },
  { id: 'analytics',   icon: <BarChart3 size={24} />,label: 'Analytics',   color: '#FDBA74', glow: '#FED7AA' },
  { id: 'security',    icon: <Shield size={24} />,   label: 'Security',    color: '#F87171', glow: '#FCA5A5' },
  { id: 'performance', icon: <Zap size={24} />,      label: 'Performance', color: '#FACC15', glow: '#FEF08A' },
  { id: 'database',    icon: <Database size={24} />, label: 'Database',    color: '#67E8F9', glow: '#A5F3FC' },
  { id: 'collaboration',icon: <Users size={24} />,   label: 'Collaboration',color: '#A5B4FC',glow: '#C7D2FE' },
];

/**
 * กระจายไอคอน 8 ตำแหน่งรอบวง: N, NE, E, SE, S, SW, W, NW
 * องศาตามมาตรฐานคณิตศาสตร์: 0° = ขวา, 90° = บน เราจะหมุนให้ N ขึ้นก่อน (-90°)
 */
const ANGLES = [-90, -45, 0, 45, 90, 135, 180, -135];

const NetworkLogoHub: React.FC = () => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // ใช้ ref เพื่อวัดขนาดจริงของคอนเทนเนอร์ (แก้ปัญหา SSR/window)
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState<number>(384); // ค่าตั้งต้นเท่ากับ md:w-96

  useEffect(() => {
    const measure = () => {
      const side = boxRef.current?.getBoundingClientRect().width ?? 384;
      setBoxSize(side);
    };
    measure();
    setReady(true);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const center = useMemo<XY>(() => ({ x: boxSize / 2, y: boxSize / 2 }), [boxSize]);

  // คำนวณรัศมี และขนาดกรอบไอคอนตามความกว้างจริงของกล่อง
  const radius = useMemo(() => {
    // ให้อยู่ในระยะสวย ๆ ภายในกรอบ (เหลือที่ให้ path เลี้ยว)
    return Math.round(boxSize * 0.36);
  }, [boxSize]);

  const iconBox = useMemo(() => {
    // ขนาดกล่องของไอคอน (รวม padding) ใกล้เคียงกับ p-4 + ไอคอน
    return boxSize < 360 ? 56 : 64; // mobile vs desktop
  }, [boxSize]);

  const iconRadius = iconBox / 2;

  const icons: NetworkIcon[] = useMemo(
    () =>
      ICONS_DEF.map((b, i) => ({
        ...b,
        angleDeg: ANGLES[i],
      })),
    []
  );

  // ตำแหน่ง (จุดกึ่งกลาง) ของไอคอนรอบวง
  const iconCenters = useMemo<Record<string, XY>>(() => {
    const toXY = (deg: number): XY => {
      const rad = (deg * Math.PI) / 180;
      return {
        x: center.x + radius * Math.cos(rad),
        y: center.y + radius * Math.sin(rad),
      };
    };
    const map: Record<string, XY> = {};
    icons.forEach((ic) => (map[ic.id] = toXY(ic.angleDeg)));
    return map;
  }, [center.x, center.y, radius, icons]);

  /**
   * สร้างเส้นแบบ "วงจร" (Manhattan / orthogonal path):
   *  - ออกแนวแกน x หรือ y จากจุดศูนย์กลางก่อน (เลือกระยะ busOffset)
   *  - เลี้ยว 90° ไปยังแกนอีกตัว
   *  - หยุดก่อนถึงกรอบไอคอน (iconRadius) เพื่อไม่ให้ชน
   */
  const makeCircuitPath = (target: XY, stopR = iconRadius): string => {
    const cx = center.x, cy = center.y;
    const dx = target.x - cx;
    const dy = target.y - cy;
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;

    // ออกจากศูนย์กลางเล็กน้อยให้เห็นว่า "เดินออกจาก hub" ชัดเจน
    const bus = Math.min(Math.max(boxSize * 0.08, 20), 36);

    // เลือกแกนที่ไกลกว่าเพื่อเป็นแกนแรก
    const goXFirst = Math.abs(dx) >= Math.abs(dy);

    // จุดปลายสุด (หยุดก่อนชนกรอบไอคอน)
    const stopX = target.x - signX * stopR;
    const stopY = target.y - signY * stopR;

    let p = `M ${cx} ${cy} `;

    if (goXFirst) {
      const x1 = cx + signX * bus;
      p += `L ${x1} ${cy} `;              // วิ่งแกน X ออกไปก่อน
      p += `L ${x1} ${stopY} `;           // เลี้ยวขึ้น/ลง ไปแตะระดับเดียวกับไอคอน
      p += `L ${stopX} ${stopY}`;         // เลี้ยวซ้าย/ขวา เข้าหาไอคอน (หยุดก่อนขอบ)
    } else {
      const y1 = cy + signY * bus;
      p += `L ${cx} ${y1} `;              // วิ่งแกน Y ออกไปก่อน
      p += `L ${stopX} ${y1} `;           // เลี้ยวซ้าย/ขวา ไปแตะระดับเดียวกับไอคอน
      p += `L ${stopX} ${stopY}`;         // เลี้ยวขึ้น/ลง เข้าหาไอคอน (หยุดก่อนขอบ)
    }

    return p;
  };

  return (
    <div className="flex justify-center mb-8 relative">
      <div className="relative">
        {/* กล่องหลักของ network */}
        <div ref={boxRef} className="relative w-80 h-80 md:w-96 md:h-96">
          {/* ===== SVG เส้นเชื่อมทั้งหมด ===== */}
          <svg
            className="absolute inset-0"
            width="100%"
            height="100%"
            viewBox={`0 0 ${boxSize} ${boxSize}`}
            style={{ overflow: 'visible', pointerEvents: 'none' }}
          >
            <defs>
              {/* glow filter สำหรับเส้น */}
              <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* glow เล็ก ๆ สำหรับ spark */}
              <filter id="spark-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {icons.map((ic, idx) => {
              const target = iconCenters[ic.id];
              const pathD = makeCircuitPath(target);

              // speed/offset ต่างกันเล็กน้อยให้ดูเป็นธรรมชาติ
              const dashDur = 1.1 + (idx % 4) * 0.2;
              const sparkDur = 1.2 + (idx % 3) * 0.25;
              const beginOffset = `${(idx * 0.13).toFixed(2)}s`;

              return (
                <g key={ic.id}>
                  {/* เส้นฐาน (PCB trace) */}
                  <path
                    d={pathD}
                    stroke="rgba(148, 163, 184, 0.25)"
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="square"
                    strokeLinejoin="round"
                  />

                  {/* กระแสไฟวิ่งบนเส้น */}
                  <path
                    id={`path-${ic.id}`}
                    d={pathD}
                    stroke={hovered === ic.id ? ic.glow : ic.color}
                    strokeWidth={hovered === ic.id ? 2.6 : 2.2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: 'url(#soft-glow)',
                      mixBlendMode: 'screen',
                      // ช่วงเส้นสว่างที่วิ่ง (dash ยาวกว่า path เพื่อให้เห็นเป็นแถบไฟไหล)
                      strokeDasharray: '26 220',
                      animation: `dash-move ${dashDur}s linear infinite`,
                      opacity: hovered === ic.id ? 1 : 0.9,
                    }}
                  />

                  {/* sparks 2 จุดวิ่งแบบไม่พร้อมกัน ให้ดูเหมือนไฟฟ้าช๊อต */}
                  <g style={{ filter: 'url(#spark-glow)', mixBlendMode: 'screen' }}>
                    {[0, 1].map((s) => (
                      <circle key={`${ic.id}-spark-${s}`} r={hovered === ic.id ? 2.4 : 2} fill={ic.glow} opacity={0.95}>
                        <animateMotion
                          dur={`${sparkDur + s * 0.2}s`}
                          begin={s === 0 ? beginOffset : `calc(${beginOffset} + 0.35s)`}
                          repeatCount="indefinite"
                          rotate="auto"
                        >
                          {/* React รองรับทั้ง href และ xlinkHref ใน mpath (บางเบราว์เซอร์ยังชอบ xlinkHref) */}
                          <mpath href={`#path-${ic.id}`} xlinkHref={`#path-${ic.id}`} />
                        </animateMotion>
                      </circle>
                    ))}
                  </g>
                </g>
              );
            })}

            {/* จุดศูนย์กลาง (ให้เห็นหัวสาย) */}
            <circle cx={center.x} cy={center.y} r={3} fill="rgba(148,163,184,0.55)" />
          </svg>

          {/* ===== โลโก้ตรงกลาง (โครงสร้างเดิม) ===== */}
          <div className="absolute inset-0 flex justify-center items-center z-10">
            <div className="logo-container group/logo">
              <div className="logo-shimmer"></div>
              <div className="logo-border"></div>
              <div className="logo-background"></div>
              <div className="logo-image transition-all duration-500 group-hover/logo:scale-110 group-hover/logo:rotate-12">
                <Image
                  src="/logo.svg"
                  alt="UniSight Logo"
                  width={80}
                  height={80}
                  className="h-20 w-20 opacity-90 group-hover/logo:opacity-100 transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* ===== ไอคอนรอบ ๆ ===== */}
          <div className="absolute inset-0 pointer-events-none">
            {icons.map((ic, index) => {
              const c = iconCenters[ic.id];
              return (
                <div
                  key={ic.id}
                  className={`absolute pointer-events-auto cursor-pointer transition-all duration-500 ${
                    ready ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}
                  style={{
                    left: c.x,
                    top: c.y,
                    transform: `translate(-50%, -50%)`,
                    transitionDelay: `${index * 100}ms`,
                  }}
                  onMouseEnter={() => setHovered(ic.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    className={`relative rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md
                                border border-white/10 hover:border-white/20 transition-all duration-300 group/icon
                                shadow-lg hover:shadow-xl ${hovered === ic.id ? 'scale-105 shadow-2xl' : 'scale-100'}`}
                    style={{ padding: boxSize < 360 ? 16 : 20 }}
                  >
                    {/* glow background ตอน hover */}
                    <div
                      className={`absolute inset-0 rounded-2xl opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300 blur-md`}
                      style={{ backgroundColor: `${ic.color}26` /* 0x26 ≈ 15% */ }}
                    />
                    <div
                      className="relative z-10"
                      style={{ color: hovered === ic.id ? ic.glow : ic.color }}
                    >
                      {ic.icon}
                    </div>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded-md opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                      {ic.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CSS สำหรับแอนิเมชันเส้นวิ่ง/ไฟกระพริบ */}
        <style jsx global>{`
          @keyframes dash-move {
            0% {
              stroke-dashoffset: 0;
              filter: url(#soft-glow);
            }
            100% {
              stroke-dashoffset: -240;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default NetworkLogoHub;
