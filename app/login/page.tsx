;"use client"

import { LoginForm } from "@/components/login-form"

export const dynamic = 'force-dynamic'

export default function Page() {
  const backgrounds = [
    "/animation-1.svg",
    "/animation-2.svg",
    "/animation-3.svg",
    "/animation-4.svg",
    "/animation-5.svg",
    "/animation-6.svg",
  ]

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center bg-[#050505] p-6 md:p-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/6 to-black/80 mix-blend-screen" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22)_0%,_rgba(255,255,255,0)_40%)] opacity-60" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {backgrounds.map((src, idx) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-0 animate-[bgCycle_7s_linear_infinite]"
            style={{
              // pack all six background animations into the active window, then cool off
              animationDelay: `${idx * 0.3}s`,
              filter:
                "brightness(0) invert(1) drop-shadow(0 0 18px rgba(255,140,0,0.65)) drop-shadow(0 0 42px rgba(255,140,0,0.5))",
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-6 md:top-10 flex flex-col items-center gap-3 md:gap-8">
        <img
          src="/gridalert-logo.svg"
          alt="GridAlert"
          className="h-28 w-auto md:h-36 drop-shadow-[0_14px_48px_rgba(0,0,0,0.6)] animate-[logoCycle_7s_ease-in-out_infinite]"
        />
        <span className="text-white text-2xl md:text-3xl font-semibold tracking-tight drop-shadow-[0_3px_12px_rgba(0,0,0,0.55)]">
          GridAlert
        </span>
      </div>

      <div className="relative w-full max-w-md px-2 sm:px-4">
        <LoginForm />
      </div>

      <style jsx global>{`
        @keyframes bgCycle {
          0% {
            opacity: 0;
            transform: scale(1);
          }
          6% {
            opacity: 0.6;
          }
          12% {
            opacity: 0.8;
            transform: scale(1.006);
          }
          18% {
            opacity: 0;
            transform: scale(1.004);
          }
          100% {
            opacity: 0;
            transform: scale(1.01);
          }
        }

        @keyframes logoCycle {
          0% {
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(255,140,0,0.35)) drop-shadow(0 0 24px rgba(255,140,0,0.25));
          }
          12% {
            transform: scale(1.16);
            filter: drop-shadow(0 0 14px rgba(255,160,0,0.55)) drop-shadow(0 0 32px rgba(255,160,0,0.4));
          }
          28.5% {
            transform: scale(1);
            filter: drop-shadow(0 0 12px rgba(255,140,0,0.45)) drop-shadow(0 0 26px rgba(255,140,0,0.32));
          }
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(255,140,0,0.35)) drop-shadow(0 0 24px rgba(255,140,0,0.25));
          }
        }
      `}</style>
    </div>
  )
}
