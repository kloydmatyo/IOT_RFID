import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Download,
  Clock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

/* Landing page (the first page people see at "/").
   Only "Log in" is offered: there is no registration. */

const SITE_NAME = "GC RFID Attendance";

const C = {
  bg: "#f8faf8",
  surface: "#ffffff",
  border: "#e8ece9",
  text: "#111827",
  muted: "#5b6472",
  green: "#16a34a",
  greenDark: "#15803d",
  greenSoft: "#ecfdf3",
  greenEdge: "#dcfce7",
  ink: "#10231a",
  amber: "#d97706",
  amberSoft: "#fef3c7",
};

const taps = [
  { name: "Carlo Ramos", initials: "CR", time: "12:52 PM", status: "On time" },
  { name: "Bea Navarro", initials: "BN", time: "12:58 PM", status: "On time" },
  { name: "Paolo Aquino", initials: "PA", time: "1:14 PM", status: "Late" },
];

const features = [
  {
    icon: CreditCard,
    title: "Tap in, tap out",
    text: "Each RFID card tap records the time in and time out for a class, so you also know how long a student stayed.",
  },
  {
    icon: LayoutDashboard,
    title: "A live class dashboard",
    text: "See who is present, late, or has not tapped yet. Students with 3 or more absences, or a rate under 75%, are flagged for you.",
  },
  {
    icon: Download,
    title: "Records you can export",
    text: "Filter by date, class, section, or year level and export the result to CSV for your own files or reports.",
  },
];

const steps = [
  {
    title: "Set up your classes",
    text: "Add your classes and register students with their Gordon College student number and RFID card.",
  },
  {
    title: "Students tap their card",
    text: "The reader logs each tap. A tap more than 10 minutes after the class starts is marked late.",
  },
  {
    title: "Review and export",
    text: "Open the dashboard or attendance tab, filter the records you need, and download them.",
  },
];

function NetworkDots() {
  const pts: [number, number][] = [
    [90, 110], [260, 60], [430, 150], [610, 70], [800, 130], [990, 80], [1120, 190],
    [160, 320], [340, 260], [520, 360], [720, 300], [900, 380], [1090, 330],
    [120, 560], [300, 640], [500, 590], [700, 670], [920, 600], [1100, 700],
  ];
  const links: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12],
    [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [1, 8], [3, 10], [9, 15], [11, 17],
  ];
  return (
    <svg
      aria-hidden="true"
      className="gc-network absolute inset-0 w-full h-full"
      viewBox="0 0 1200 760"
      preserveAspectRatio="xMidYMid slice"
    >
      {links.map(([a, b], i) => (
        <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke={C.green} strokeOpacity=".1" />
      ))}
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          className="gc-network-node"
          style={{ animationDelay: `${(i % 7) * -0.65}s` }}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 4 : 2.5}
          fill="#22c55e"
          fillOpacity={i % 3 === 0 ? 0.55 : 0.35}
        />
      ))}
      <g className="gc-network-tracer">
        <animateMotion
          dur="8s"
          repeatCount="indefinite"
          path="M 90 110 L 260 60 L 430 150 L 610 70 L 800 130 L 990 80 L 1120 190"
        />
        <circle r="8" fill="#22c55e" fillOpacity=".18" />
        <circle r="3.5" fill="#16a34a" fillOpacity=".9" />
      </g>
      <g className="gc-network-tracer">
        <animateMotion
          dur="10s"
          begin="-4s"
          repeatCount="indefinite"
          path="M 160 320 L 340 260 L 520 360 L 720 300 L 900 380 L 1090 330"
        />
        <circle r="8" fill="#22c55e" fillOpacity=".18" />
        <circle r="3.5" fill="#16a34a" fillOpacity=".9" />
      </g>
      <g className="gc-network-tracer">
        <animateMotion
          dur="9s"
          begin="-6s"
          repeatCount="indefinite"
          path="M 120 560 L 300 640 L 500 590 L 700 670 L 920 600 L 1100 700"
        />
        <circle r="8" fill="#22c55e" fillOpacity=".18" />
        <circle r="3.5" fill="#16a34a" fillOpacity=".9" />
      </g>
    </svg>
  );
}

function LogoMark() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/gclogo.png" alt="Gordon College logo" className="w-9 h-9 rounded-full object-contain" />
    </>
  );
}

export default function LandingPage() {
  return (
    <div style={{ background: C.bg, fontFamily: "'Poppins', system-ui, sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        html { scroll-behavior: smooth; }
        .gc-btn-primary { background: ${C.green}; color: #fff; transition: background .2s, transform .2s, box-shadow .2s; }
        .gc-btn-primary:hover { background: ${C.greenDark}; transform: translateY(-2px); box-shadow: 0 12px 26px rgba(22,163,74,.28); }
        .gc-btn-outline { background: ${C.surface}; color: ${C.text}; border: 1px solid ${C.border}; transition: border-color .2s, transform .2s, box-shadow .2s; }
        .gc-btn-outline:hover { border-color: ${C.green}; transform: translateY(-2px); box-shadow: 0 10px 24px rgba(16,35,26,.07); }
        .gc-link { color: ${C.muted}; transition: color .15s; }
        .gc-link:hover { color: ${C.green}; }
        .gc-btn-primary:focus-visible, .gc-btn-outline:focus-visible, .gc-link:focus-visible { outline: 2px solid ${C.green}; outline-offset: 3px; }
        .hero-card { transform: perspective(1400px) rotateY(-8deg) rotateX(2deg) rotateZ(-1deg); animation: card-float 6s ease-in-out infinite; transition: box-shadow .3s; }
        .hero-card:hover { box-shadow: 0 38px 75px rgba(16,35,26,.17), 0 3px 0 ${C.greenEdge} !important; }
        .hero-glow { position:absolute; width:24rem; height:24rem; border-radius:9999px; filter:blur(70px); background:rgba(34,197,94,.12); pointer-events:none; }
        .gc-grid { background-image:linear-gradient(rgba(22,163,74,.035) 1px, transparent 1px),linear-gradient(90deg,rgba(22,163,74,.035) 1px,transparent 1px); background-size:42px 42px; mask-image:linear-gradient(to bottom,black,transparent 92%); }
        .gc-network { transform-origin:center; animation:network-drift 14s ease-in-out infinite alternate; }
        .gc-network-node { transform-box:fill-box; transform-origin:center; animation:network-twinkle 4.8s ease-in-out infinite; }
        .gc-network-tracer { filter:drop-shadow(0 0 5px rgba(22,163,74,.65)); }
        .gc-enter { animation: enter-up .7s cubic-bezier(.2,.8,.2,1) both; }
        .gc-enter-1 { animation-delay:.1s; }
        .gc-enter-2 { animation-delay:.22s; }
        .gc-enter-3 { animation-delay:.34s; }
        .gc-feature { transition: transform .25s, box-shadow .25s, border-color .25s; }
        .gc-feature:hover { transform: translateY(-6px); border-color: rgba(22,163,74,.28) !important; box-shadow: 0 18px 36px rgba(16,35,26,.08), 0 3px 0 ${C.greenEdge} !important; }
        .gc-step { transition: transform .25s, background .25s; }
        .gc-step:hover { transform: translateY(-4px); background: #f0fdf4 !important; }
        @keyframes enter-up { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes network-drift { from { transform:translate3d(-7px,4px,0) scale(1.015); } to { transform:translate3d(7px,-5px,0) scale(1.025); } }
        @keyframes network-twinkle { 0%,100% { opacity:.55; } 50% { opacity:1; } }
        @keyframes card-float { 0%,100% { transform: perspective(1400px) rotateY(-8deg) rotateX(2deg) rotateZ(-1deg) translateY(0); } 50% { transform: perspective(1400px) rotateY(-8deg) rotateX(2deg) rotateZ(-1deg) translateY(-8px); } }
        @media (max-width: 1023px) {
          .hero-card { animation-name: card-float-mobile; }
          @keyframes card-float-mobile { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-7px); } }
        }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; scroll-behavior:auto !important; transition-duration:.01ms !important; } .gc-network-tracer { display:none; } }
        @media (prefers-reduced-motion: no-preference) {
          .live-dot { animation: livePulse 1.8s ease-in-out infinite; }
          @keyframes livePulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        }
      `}</style>

      {/* ============================== NAV ============================== */}
      <header
        className="sticky top-0 z-40"
        style={{ background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.border}` }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark />
            <span className="text-sm font-bold tracking-tight">{SITE_NAME}</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-6">
            <a href="#features" className="gc-link hidden sm:inline text-sm font-medium">Features</a>
            <a href="#how" className="gc-link text-sm font-medium px-2 sm:px-0">How it works</a>
            <Link href="/login" className="gc-btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold">
              Log in
            </Link>
          </nav>
        </div>
      </header>

      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden">
        <div className="hero-glow -top-32 -right-24" aria-hidden="true" />
        <div className="hero-glow -bottom-48 -left-32" aria-hidden="true" />
        <div className="gc-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
        <NetworkDots />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-14 items-center">
          <div className="gc-enter">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm"
              style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
            >
              <Sparkles className="w-3.5 h-3.5" /> Built for Gordon College
            </span>
            <h1 className="mt-6 text-5xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Tap your ID.
              <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(100deg, ${C.green}, #4ade80)` }}>Attendance done.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed max-w-md gc-enter gc-enter-1" style={{ color: C.muted }}>
              RFID-based attendance monitoring for Gordon College. Students tap in and out at the reader, and you see who is present, late, or absent as it happens.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 gc-enter gc-enter-2">
              <Link
                href="/login"
                className="gc-btn-primary inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold"
                style={{ boxShadow: "0 8px 20px rgba(22,163,74,.25)" }}
              >
                Log in <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how" className="gc-btn-outline inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold">
                See how it works <ChevronRight className="w-4 h-4" />
              </a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium gc-enter gc-enter-3" style={{ color: C.muted }}>
              {["Tap in and tap out", "Automatic late marking", "Export to CSV"].map(t => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" style={{ color: C.green }} /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Product preview */}
          <div className="relative gc-enter gc-enter-2">
            <div className="absolute -inset-5 rounded-[2rem] opacity-60 blur-2xl" style={{ background: "linear-gradient(135deg, rgba(34,197,94,.18), rgba(22,163,74,.04))" }} aria-hidden="true" />
            <div
              className="hero-card relative rounded-3xl p-6 sm:p-7"
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                boxShadow: "0 30px 60px rgba(16,35,26,.12), 0 3px 0 " + C.greenEdge,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: "#22c55e" }}
                  >
                    BT
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">CCS-BSIT · ITP415A</p>
                    <p className="text-xs flex items-center gap-1.5" style={{ color: C.muted }}>
                      <Clock className="w-3.5 h-3.5" /> Mon/Wed 1:00-2:00 PM
                    </p>
                  </div>
                </div>
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                  style={{ background: C.greenSoft, color: C.greenDark }}
                >
                  <span className="live-dot w-2 h-2 rounded-full" style={{ background: C.green }} /> Live
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                {[
                  { label: "Present", value: "28", bg: C.greenSoft, color: C.greenDark },
                  { label: "Late", value: "3", bg: C.amberSoft, color: C.amber },
                  { label: "Not yet tapped", value: "4", bg: "#f3f4f6", color: C.text },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-4 transition-transform hover:-translate-y-1" style={{ background: s.bg }}>
                    <p className="text-[11px] font-semibold" style={{ color: C.muted }}>{s.label}</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex h-2.5 rounded-full overflow-hidden" style={{ background: "#e5e7eb" }}>
                <div style={{ width: "80%", background: "#16a34a" }} />
                <div style={{ width: "9%", background: "#d97706" }} />
              </div>

              <p className="text-xs font-semibold mt-6 mb-3" style={{ color: C.muted }}>Recent taps</p>
              <ul className="space-y-3">
                {taps.map(t => (
                  <li key={t.name} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{ background: C.greenSoft, color: C.greenDark, border: `1px solid ${C.greenEdge}` }}
                    >
                      {t.initials}
                    </div>
                    <p className="text-sm font-semibold flex-1 min-w-0 truncate">{t.name}</p>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{t.time}</p>
                      <p className="text-[11px] font-medium" style={{ color: t.status === "Late" ? C.amber : C.green }}>
                        {t.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ FEATURES ============================ */}
      <section id="features" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 scroll-mt-20">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-xl">
          Everything you need to track a class, in one place.
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {features.map(f => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="gc-feature rounded-2xl p-7"
                style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: `0 3px 0 ${C.greenEdge}` }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: C.greenSoft }}>
                  <Icon className="w-6 h-6" style={{ color: C.green }} />
                </div>
                <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: C.muted }}>{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section id="how" className="scroll-mt-20" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How it works</h2>
          <p className="mt-3 max-w-lg" style={{ color: C.muted }}>
            From setup to a finished attendance sheet in three steps.
          </p>
          <ol className="grid md:grid-cols-3 gap-6 mt-12">
            {steps.map((s, i) => (
              <li key={s.title} className="gc-step rounded-2xl p-7" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: C.green }}
                >
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: C.muted }}>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================== CTA ============================== */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-12 sm:px-14 flex flex-wrap items-center justify-between gap-6"
          style={{ background: C.ink }}
        >
          <div className="absolute -right-12 -top-24 w-72 h-72 rounded-full border border-white/10 pointer-events-none" aria-hidden="true" />
          <div className="absolute -right-2 -top-14 w-52 h-52 rounded-full border border-white/10 pointer-events-none" aria-hidden="true" />
          <div className="max-w-md">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Ready to take attendance?</h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,.7)" }}>
              Log in with your account to open your classes and today&apos;s records.
            </p>
          </div>
          <Link
            href="/login"
            className="gc-btn-primary inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold"
          >
            Log in <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ============================== FOOTER ============================== */}
      <footer style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: C.muted }}>
          <div className="flex items-center gap-3">
            <LogoMark />
            <span>RFID-Based Student Attendance Monitoring</span>
          </div>
          <span>Gordon College</span>
        </div>
      </footer>
    </div>
  );
}