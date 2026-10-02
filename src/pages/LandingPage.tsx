
import { Link, useSearchParams } from 'react-router-dom';
import { Alert } from '@/components/ui/Alert';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  ScanLine,
  ShieldCheck,
  PackageCheck,
  SearchCheck,
} from 'lucide-react';

const features = [
  {
    number: '01',
    icon: ScanLine,
    title: 'Capture evidence',
    text: 'Capture package images and scan available product information using the inspection workflow.',
  },
  {
    number: '02',
    icon: SearchCheck,
    title: 'Identify details',
    text: 'Review product information, declarations, barcode data and manually correct unreadable details.',
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Check compliance',
    text: 'Evaluate applicable packaged-commodity requirements through configurable compliance rules.',
  },
  {
    number: '04',
    icon: FileCheck2,
    title: 'Verify & report',
    text: 'Verify findings and generate a clear final inspection report with the inspection result.',
  },
];

const checks = [
  'Product identification',
  'Manufacturer / packer details',
  'MRP declaration',
  'Net quantity',
  'Consumer care information',
  'Required package declarations',
];

export function LandingPage() {
  const [searchParams] = useSearchParams();

  const denied = searchParams.get('access') === 'denied';
  const reason = searchParams.get('reason');

  const denialMessage =
    reason === 'suspended'
      ? 'Inspection access for this account has been suspended. Contact the administrator if you believe this is incorrect.'
      : 'Inspection access was rejected for this account. You can still view the public site, but inspection pages are not available.';

  return (
    <div className="min-h-screen bg-[#F7F1E3] text-[#3F3931]">

      {/* =========================================================
          HEADER
      ========================================================== */}
      <header className="sticky top-0 z-50 border-b border-[#DED3BF] bg-[#F7F1E3]/95 backdrop-blur">
        <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between px-6 lg:px-10">

          {/* Logo */}
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3A3026] text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
              <ClipboardCheck className="h-6 w-6" />
            </div>

            <div className="leading-none">
              <div className="text-[23px] font-bold tracking-[-0.04em]">
                Metri<span className="text-[#B08D57]">Check</span>
              </div>

              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#877D70]">
                Inspection & Verification
              </div>
            </div>
          </Link>

          {/* Navigation */}
          {/* Navigation */}
          <nav className="hidden items-center gap-9 md:flex">
            <a
              href="#home"
              className="text-[15px] font-medium text-[#756D62] transition-colors hover:text-[#3A3026]"
            >
              Home
            </a>

            <a
              href="#process"
              className="text-[15px] font-medium text-[#756D62] transition-colors hover:text-[#3A3026]"
            >
              Process
            </a>

            <a
              href="#features"
              className="text-[15px] font-medium text-[#756D62] transition-colors hover:text-[#3A3026]"
            >
              Features
            </a>

            <Link
              to="/about"
              className="text-[15px] font-medium text-[#756D62] transition-colors hover:text-[#3A3026]"
            >
              About
            </Link>

            <Link
              to="/contact"
              className="text-[15px] font-medium text-[#756D62] transition-colors hover:text-[#3A3026]"
            >
              Contact
            </Link>

            <Link
              to="/consumer-grievance"
              className="text-[15px] font-medium text-[#756D62] transition-colors hover:text-[#3A3026]"
            >
              Consumer Grievance
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/request-demo"
              className="hidden rounded-lg px-4 py-2.5 text-sm font-semibold text-[#6B5846] transition-colors hover:bg-[#E9DFC9] sm:inline-flex"
            >
              Request Demo
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3A3026] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#6B5846] hover:shadow-md"
            >
              <span>Inspector Login</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================
          ACCESS DENIED
      ========================================================== */}
      {denied && (
        <div className="mx-auto max-w-[1440px] px-6 pt-6 lg:px-10">
          <Alert variant="error" title="Access denied">
            {denialMessage}
          </Alert>
        </div>
      )}

      {/* =========================================================
          HERO
      ========================================================== */}
      <main id="home">

        <section className="relative overflow-hidden border-b border-[#DED3BF] bg-[#F7F1E3]">

          {/* Decorative background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">

            <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-[#E9DFC9] opacity-70 blur-3xl" />

            <div className="absolute -bottom-48 left-1/3 h-[500px] w-[500px] rounded-full bg-[#F0E8D8] opacity-90 blur-3xl" />

            <div className="absolute right-[44%] top-24 h-px w-80 rotate-45 bg-[#D2C3AA]" />

            <div className="absolute right-[40%] top-36 h-px w-96 -rotate-45 bg-[#D2C3AA]" />

          </div>

          <div className="relative mx-auto grid min-h-[720px] max-w-[1440px] items-center gap-12 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-20">

            {/* Left */}
            <div className="max-w-[720px]">

              <div className="mb-7 flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B08D57]" />

                <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#6B5846]">
                  Legal Metrology • Packaged Commodities
                </span>
              </div>

              <h1 className="max-w-[700px] text-[58px] font-semibold leading-[0.98] tracking-[-0.055em] text-[#3F3931] sm:text-[72px] lg:text-[82px]">
                Make every
                <br />
                <span className="text-[#6B5846]">label</span> accountable.
              </h1>

              <p className="mt-8 max-w-[650px] text-lg leading-8 text-[#756D62] sm:text-xl">
                MetriCheck gives authorized inspectors a clear,
                evidence-led way to review packaged commodities —
                from the first photograph to the final report.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  to="/login"
                  className="group inline-flex items-center gap-3 rounded-xl bg-[#3A3026] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#3A3026]/15 transition-all duration-300 hover:-translate-y-1 hover:bg-[#6B5846]"
                >
                  Start inspection

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <a
                  href="#process"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D2C3AA] bg-[#FCF8EF] px-6 py-3.5 text-sm font-semibold text-[#51483D] transition-all duration-300 hover:border-[#B08D57] hover:bg-[#E9DFC9] hover:text-[#3A3026]"
                >
                  Explore the process
                </a>
              </div>

              {/* Small trust line */}
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#DED3BF] pt-6 text-xs font-medium text-[#81786B]">

                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#68745A]" />
                  Evidence-led workflow
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#68745A]" />
                  Rules-based checks
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#68745A]" />
                  Traceable reports
                </span>

              </div>
            </div>

            {/* Right visual */}
            <div className="relative mx-auto w-full max-w-[650px]">

              {/* Main inspection frame */}
              <div className="relative min-h-[560px] overflow-hidden rounded-[32px] border border-[#D2C3AA] bg-[#E9DFC9] shadow-2xl shadow-[#3A3026]/10">

                {/* Geometric package background */}
                <div className="absolute inset-0">

                  <div className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#B9A98D]/70" />

                  <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 border border-[#C9BBA2]/80" />

                  <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white/30" />

                </div>

                {/* Scanning frame */}
                <div className="absolute left-1/2 top-1/2 h-[390px] w-[330px] -translate-x-1/2 -translate-y-1/2">

                  {/* Corner brackets */}
                  <div className="absolute -left-1 -top-1 h-10 w-10 border-l-4 border-t-4 border-[#3A3026]" />

                  <div className="absolute -right-1 -top-1 h-10 w-10 border-r-4 border-t-4 border-[#3A3026]" />

                  <div className="absolute -bottom-1 -left-1 h-10 w-10 border-b-4 border-l-4 border-[#3A3026]" />

                  <div className="absolute -bottom-1 -right-1 h-10 w-10 border-b-4 border-r-4 border-[#3A3026]" />

                  {/* Package */}
                  <div className="absolute left-1/2 top-1/2 h-[330px] w-[245px] -translate-x-1/2 -translate-y-1/2 rotate-[-7deg] rounded-sm border border-[#C9BBA2] bg-[#FFFDF7] shadow-xl">

                    <div className="absolute left-0 right-0 top-0 h-12 bg-[#3A3026]" />

                    <div className="absolute left-5 right-5 top-20 border border-[#DED3BF] bg-[#F5EEDF] p-5">

                      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#877D70]">
                        METRICHECK
                      </div>

                      <div className="mt-3 text-xl font-black tracking-tight text-[#3F3931]">
                        PACKAGED
                      </div>

                      <div className="text-xl font-black tracking-tight text-[#6B5846]">
                        PRODUCT
                      </div>

                      <div className="mt-5 h-px bg-[#DED3BF]" />

                      <div className="mt-4 space-y-2 text-[8px] text-[#877D70]">

                        <div className="flex justify-between">
                          <span>NET QTY</span>
                          <span className="font-bold text-[#51483D]">
                            500 g
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>MRP</span>
                          <span className="font-bold text-[#51483D]">
                            ₹120
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span>LABEL</span>
                          <span className="font-bold text-[#68745A]">
                            READY
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Barcode */}
                    <div className="absolute bottom-7 left-7 right-7">
                      <div className="flex h-10 items-end justify-center gap-[2px] overflow-hidden opacity-70">

                        {[3, 1, 2, 5, 1, 3, 2, 1, 4, 2, 5, 1, 2, 3, 1, 4, 2, 2, 5, 1, 3, 1, 4, 2, 1, 5, 2, 3].map(
                          (width, index) => (
                            <span
                              key={index}
                              className="h-full bg-[#3F3931]"
                              style={{ width: `${width}px` }}
                            />
                          )
                        )}

                      </div>
                    </div>
                  </div>

                  {/* Scan line */}
                  <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-[#B08D57] shadow-[0_0_18px_rgba(176,141,87,0.8)]" />

                </div>

                {/* Top status */}
                <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-4 py-2 text-xs font-bold text-[#6B5846] shadow-sm backdrop-blur">

                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#68745A]" />

                  INSPECTION ACTIVE

                </div>

                {/* Bottom result card */}
                <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/70 bg-white/95 p-5 shadow-xl backdrop-blur">

                  <div className="flex items-center justify-between gap-4">

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#877D70]">
                        Current inspection
                      </div>

                      <div className="mt-1 text-base font-bold text-[#3F3931]">
                        Package label review
                      </div>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E9DFC9] text-[#68745A]">
                      <Check className="h-5 w-5" />
                    </div>

                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">

                    <div className="rounded-lg bg-[#F0E8D8] px-3 py-2">
                      <div className="text-[9px] uppercase text-[#877D70]">
                        Product
                      </div>

                      <div className="mt-1 text-xs font-bold text-[#6B5846]">
                        Identified
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#F0E8D8] px-3 py-2">
                      <div className="text-[9px] uppercase text-[#877D70]">
                        Label
                      </div>

                      <div className="mt-1 text-xs font-bold text-[#68745A]">
                        Checked
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#F1E5CE] px-3 py-2">
                      <div className="text-[9px] uppercase text-[#877D70]">
                        Review
                      </div>

                      <div className="mt-1 text-xs font-bold text-[#8A6A32]">
                        Required
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Floating side badge */}
              <div className="absolute -left-5 top-28 hidden rounded-2xl border border-[#DED3BF] bg-[#FCF8EF] p-4 shadow-xl sm:block">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E9DFC9] text-[#6B5846]">
                    <ScanLine className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#877D70]">
                      Evidence
                    </div>

                    <div className="text-sm font-bold text-[#3F3931]">
                      Captured
                    </div>
                  </div>

                </div>
              </div>

              {/* Floating verification badge */}
              <div className="absolute -right-5 bottom-36 hidden rounded-2xl border border-[#DED3BF] bg-[#FCF8EF] p-4 shadow-xl sm:block">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E9DFC9] text-[#68745A]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#877D70]">
                      Verification
                    </div>

                    <div className="text-sm font-bold text-[#3F3931]">
                      Traceable
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Scroll hint */}
          <a
            href="#process"
            className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#877D70] transition-colors hover:text-[#6B5846] lg:flex"
          >
            Discover MetriCheck
            <ArrowDown className="h-4 w-4" />
          </a>

        </section>

        {/* =========================================================
            INTRO STRIP
        ========================================================== */}
        <section className="border-b border-[#DED3BF] bg-[#3A3026] text-white">

          <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">

            <div>

              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#D8C7A9]">
                A clearer inspection workflow
              </div>

              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                From package evidence to a final, traceable inspection result.
              </h2>

            </div>

            <div className="flex items-end">

              <p className="max-w-xl text-sm leading-7 text-[#E4DAC9]">
                MetriCheck brings product identification, package information,
                compliance checks, verification and reporting into one structured
                inspection workflow.
              </p>

            </div>

          </div>
        </section>

        {/* =========================================================
            PROCESS
        ========================================================== */}
        <section
          id="process"
          className="scroll-mt-24 border-b border-[#DED3BF] bg-[#F7F1E3]"
        >

          <div className="mx-auto max-w-[1440px] px-6 py-20 lg:px-10 lg:py-28">

            <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">

              <div>

                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#B08D57]">
                  How it works
                </div>

                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-[#3F3931] sm:text-5xl">
                  Four stages.
                  <br />
                  One workflow.
                </h2>

                <p className="mt-6 max-w-md text-base leading-7 text-[#756D62]">
                  Every inspection follows a structured path so that evidence,
                  findings and final decisions remain connected.
                </p>

                <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-full border border-[#D2C3AA] bg-[#FCF8EF] text-[#6B5846]">
                  <ArrowDown className="h-5 w-5" />
                </div>

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                {features.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      key={feature.number}
                      className="group relative overflow-hidden rounded-2xl border border-[#DED3BF] bg-[#FCF8EF] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#B9A98D] hover:shadow-xl hover:shadow-[#3A3026]/5"
                    >

                      <div className="flex items-start justify-between">

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E9DFC9] text-[#6B5846] transition-colors group-hover:bg-[#3A3026] group-hover:text-white">
                          <Icon className="h-5 w-5" />
                        </div>

                        <span className="text-sm font-bold text-[#C9BBA2]">
                          {feature.number}
                        </span>

                      </div>

                      <h3 className="mt-7 text-xl font-bold tracking-tight text-[#3F3931]">
                        {feature.title}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-[#756D62]">
                        {feature.text}
                      </p>

                      <div className="absolute bottom-0 left-0 h-1 w-0 bg-[#B08D57] transition-all duration-300 group-hover:w-full" />

                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            INSPECTION SHOWCASE
        ========================================================== */}
        <section className="overflow-hidden border-b border-[#DED3BF] bg-[#FCF8EF]">

          <div className="mx-auto grid max-w-[1440px] items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">

            {/* Visual */}
            <div className="relative">

              <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#E9DFC9] blur-3xl" />

              <div className="relative rounded-[28px] border border-[#DED3BF] bg-[#F0E8D8] p-5 shadow-xl">

                <div className="rounded-2xl border border-[#DED3BF] bg-[#FCF8EF] p-5">

                  <div className="flex items-center justify-between border-b border-[#E2D8C8] pb-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6B5846] text-white">
                        <PackageCheck className="h-5 w-5" />
                      </div>

                      <div>

                        <div className="text-xs font-bold uppercase tracking-wider text-[#877D70]">
                          Inspection
                        </div>

                        <div className="text-sm font-bold text-[#3F3931]">
                          Package Compliance
                        </div>

                      </div>
                    </div>

                    <span className="rounded-full bg-[#E9DFC9] px-3 py-1 text-[10px] font-bold text-[#68745A]">
                      IN PROGRESS
                    </span>

                  </div>

                  <div className="mt-5 space-y-3">

                    {checks.map((check, index) => (
                      <div
                        key={check}
                        className="flex items-center justify-between rounded-xl border border-[#E2D8C8] bg-[#F5EEDF] px-4 py-3"
                      >

                        <div className="flex items-center gap-3">

                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E9DFC9] text-[#68745A]">
                            <Check className="h-3.5 w-3.5" />
                          </div>

                          <span className="text-sm font-medium text-[#51483D]">
                            {check}
                          </span>

                        </div>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#68745A]">
                          {index === 4 ? 'Review' : 'Checked'}
                        </span>

                      </div>
                    ))}

                  </div>

                  <div className="mt-5 rounded-xl border border-[#D2C3AA] bg-[#F0E8D8] p-4">

                    <div className="flex items-center justify-between">

                      <div>

                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#877D70]">
                          Verification status
                        </div>

                        <div className="mt-1 text-base font-bold text-[#6B5846]">
                          Evidence ready for review
                        </div>

                      </div>

                      <BarChart3 className="h-6 w-6 text-[#B08D57]" />

                    </div>

                  </div>

                </div>
              </div>
            </div>

            {/* Text */}
            <div className="max-w-xl">

              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#B08D57]">
                Inspection intelligence
              </div>

              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] text-[#3F3931] sm:text-5xl">
                See the inspection,
                <br />
                not just the result.
              </h2>

              <p className="mt-6 text-base leading-8 text-[#756D62]">
                MetriCheck connects the evidence captured during an inspection
                with the product details, compliance findings and verification
                steps that follow.
              </p>

              <div className="mt-8 space-y-4">

                {[
                  'Capture package evidence',
                  'Review extracted or manually entered details',
                  'Evaluate applicable requirements',
                  'Verify findings before final reporting',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">

                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E9DFC9] text-[#6B5846]">
                      <Check className="h-3.5 w-3.5" />
                    </div>

                    <span className="text-sm font-semibold text-[#51483D]">
                      {item}
                    </span>

                  </div>
                ))}

              </div>

              <Link
                to="/login"
                className="mt-9 inline-flex items-center gap-2 text-sm font-bold text-[#6B5846] transition-colors hover:text-[#B08D57]"
              >
                Open Inspector Portal
                <ArrowRight className="h-4 w-4" />
              </Link>

            </div>
          </div>
        </section>

        {/* =========================================================
            FEATURES
        ========================================================== */}
        <section
          id="features"
          className="scroll-mt-24 border-b border-[#DED3BF] bg-[#F7F1E3]"
        >

          <div className="mx-auto max-w-[1440px] px-6 py-20 lg:px-10 lg:py-28">

            <div className="max-w-2xl">

              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#B08D57]">
                Built for inspection teams
              </div>

              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-[#3F3931] sm:text-5xl">
                Everything needed for a traceable inspection.
              </h2>

              <p className="mt-5 text-base leading-7 text-[#756D62]">
                From the first scan to the final report, the platform keeps
                the inspection workflow organized and connected.
              </p>

            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <FeatureCard
                icon={<ScanLine className="h-5 w-5" />}
                title="Smart scanning"
                text="Use package images, barcode recognition and available product information."
              />

              <FeatureCard
                icon={<ClipboardCheck className="h-5 w-5" />}
                title="Manual entry"
                text="Enter or correct details when package information cannot be read automatically."
              />

              <FeatureCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Compliance checks"
                text="Review applicable requirements and clearly identify findings."
              />

              <FeatureCard
                icon={<FileCheck2 className="h-5 w-5" />}
                title="Final reports"
                text="Bring inspection findings, verification and final statements together."
              />

            </div>
          </div>
        </section>

        {/* =========================================================
            CONSUMER GRIEVANCE
        ========================================================== */}
        <section className="border-b border-[#DED3BF] bg-[#FCF8EF]">

          <div className="mx-auto max-w-[1440px] px-6 py-20 lg:px-10 lg:py-24">

            <div className="relative overflow-hidden rounded-[30px] bg-[#3A3026] px-7 py-12 text-white sm:px-12 lg:px-16 lg:py-16">

              <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#B08D57]/20 blur-3xl" />

              <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#D8C7A9]/10 blur-3xl" />

              <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">

                <div>

                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#D8C7A9]">
                    Consumer grievance
                  </div>

                  <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                    Have a concern about a packaged commodity?
                  </h2>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[#E4DAC9]">
                    Use the public grievance form to provide product information
                    and describe your concern.
                  </p>

                </div>

                <Link
                  to="/consumer-grievance"
                  className="inline-flex h-fit items-center justify-center gap-2 rounded-xl bg-[#F7F1E3] px-6 py-3.5 text-sm font-bold text-[#3A3026] transition-all duration-300 hover:-translate-y-1 hover:bg-white"
                >
                  Submit grievance
                  <ArrowRight className="h-4 w-4" />
                </Link>

              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            CTA
        ========================================================== */}
        <section className="bg-[#F0E8D8]">

          <div className="mx-auto max-w-[1440px] px-6 py-20 text-center lg:px-10 lg:py-28">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3A3026] text-white shadow-lg">
              <ClipboardCheck className="h-7 w-7" />
            </div>

            <h2 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold tracking-[-0.045em] text-[#3F3931] sm:text-5xl">
              A clearer way to inspect,
              <br />
              verify and report.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#756D62]">
              MetriCheck brings the complete packaged commodity inspection
              workflow into one structured platform.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">

              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-[#3A3026] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#3A3026]/15 transition-all duration-300 hover:-translate-y-1 hover:bg-[#6B5846]"
              >
                Inspector Login
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/request-demo"
                className="inline-flex items-center gap-2 rounded-xl border border-[#D2C3AA] bg-[#FCF8EF] px-6 py-3.5 text-sm font-bold text-[#6B5846] transition-all duration-300 hover:border-[#B08D57] hover:bg-[#E9DFC9]"
              >
                Request Demo
              </Link>

            </div>
          </div>
        </section>

      </main>

      {/* =========================================================
          FOOTER
      ========================================================== */}
      <footer className="bg-[#2C251F] text-white">

        <div className="mx-auto max-w-[1440px] px-6 py-14 lg:px-10">

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">

            <div>

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#B08D57]">
                  <ClipboardCheck className="h-5 w-5" />
                </div>

                <div className="text-xl font-bold">
                  Metri<span className="text-[#D8C7A9]">Check</span>
                </div>

              </div>

              <p className="mt-5 max-w-sm text-sm leading-6 text-[#C9BFB0]">
                A structured inspection and verification platform for
                packaged commodity inspections.
              </p>

            </div>

            <FooterColumn
              title="Platform"
              links={[
                ['Home', '#home'],
                ['Process', '#process'],
                ['Features', '#features'],
              ]}
            />

            <FooterColumn
              title="Support"
              links={[
                ['Consumer Grievance', '/consumer-grievance'],
                ['Request Demo', '/request-demo'],
              ]}
            />

            <FooterColumn
              title="Inspector"
              links={[
                ['Officer Login', '/login'],
                ['Register', '/register'],
              ]}
            />

          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-[#AFA497] sm:flex-row sm:items-center sm:justify-between">

            <span>
              © 2026 MetriCheck. Inspection • Verification • Compliance
            </span>

            <span>
              Authorized inspection workflow
            </span>

          </div>

        </div>
      </footer>

    </div>
  );
}

/* ===============================================================
   SMALL COMPONENTS
=============================================================== */

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-2xl border border-[#DED3BF] bg-[#FCF8EF] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#B9A98D] hover:shadow-xl hover:shadow-[#3A3026]/5">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E9DFC9] text-[#6B5846] transition-colors duration-300 group-hover:bg-[#3A3026] group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-5 text-base font-bold text-[#3F3931]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#756D62]">
        {text}
      </p>

    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>

      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#D8C7A9]">
        {title}
      </h3>

      <div className="mt-4 space-y-3">

        {links.map(([label, href]) =>
          href.startsWith('/') ? (
            <Link
              key={label}
              to={href}
              className="block text-sm text-[#C9BFB0] transition-colors hover:text-white"
            >
              {label}
            </Link>
          ) : (
            <a
              key={label}
              href={href}
              className="block text-sm text-[#C9BFB0] transition-colors hover:text-white"
            >
              {label}
            </a>
          )
        )}

      </div>
    </div>
  );
}

