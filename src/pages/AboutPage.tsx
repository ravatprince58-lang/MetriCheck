
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  Users,
  ScanLine,
} from 'lucide-react';

const capabilities = [
  {
    icon: ScanLine,
    title: 'Product Identification',
    text: 'Capture product information using scanning, image capture or manual entry workflows.',
  },
  {
    icon: FileCheck2,
    title: 'Compliance Checks',
    text: 'Review applicable packaged-commodity requirements through a structured compliance workflow.',
  },
  {
    icon: ShieldCheck,
    title: 'Verification',
    text: 'Review inspection findings before completing the final inspection result.',
  },
  {
    icon: Users,
    title: 'Officer Workspace',
    text: 'Authorized inspection officers can work with their own inspection records and account.',
  },
];

const workflow = [
  'Identify the packaged product',
  'Capture and review package information',
  'Evaluate applicable compliance requirements',
  'Verify inspection findings',
  'Prepare the final inspection report',
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <ClipboardCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                MetriCheck
              </p>
              <p className="text-xs text-slate-500">
                Inspector
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">

            <Link
              to="/"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Home
            </Link>

            <Link
              to="/about"
              className="text-sm font-medium text-teal-600"
            >
              About
            </Link>

            <Link
              to="/contact"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Contact
            </Link>

            <Link
              to="/request-demo"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Request Demo
            </Link>

            <Link
              to="/login"
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Officer Sign In
            </Link>

          </nav>

          {/* Mobile */}
          <Link
            to="/login"
            className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-700 md:hidden"
          >
            Sign In
          </Link>

        </div>
      </header>

      <main>

        {/* ================= HERO ================= */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">

            <div className="max-w-4xl">

              <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                About MetriCheck
              </span>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
                A structured digital workflow for packaged commodity inspection.
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                MetriCheck helps authorized inspection officers organize
                product identification, package evidence, compliance checks,
                verification and final inspection reporting in one place.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">

                <Link
                  to="/request-demo"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700"
                >
                  Request a demo
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Contact Us
                </Link>

              </div>

            </div>
          </div>
        </section>

        {/* ================= WHAT IS METRICHECK ================= */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">

            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">

              <div>

                <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
                  The platform
                </p>

                <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                  What is MetriCheck?
                </h2>

                <p className="mt-5 leading-7 text-slate-600">
                  MetriCheck is a digital inspection platform designed to
                  organize the process of inspecting applicable packaged
                  commodities.
                </p>

                <p className="mt-4 leading-7 text-slate-600">
                  The platform connects product identification, evidence
                  collection, package information, compliance evaluation,
                  verification and final reporting into a structured workflow.
                </p>

              </div>

              {/* Workflow Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">

                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <ClipboardCheck className="h-5 w-5" />
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  Structured inspection workflow
                </h3>

                <div className="mt-6 space-y-4">

                  {workflow.map((item, index) => (
                    <div
                      key={item}
                      className="flex items-start gap-3"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
                        {index + 1}
                      </div>

                      <span className="text-sm leading-6 text-slate-600">
                        {item}
                      </span>
                    </div>
                  ))}

                </div>

              </div>

            </div>

          </div>
        </section>

        {/* ================= CAPABILITIES ================= */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">

            <div className="max-w-2xl">

              <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
                Core capabilities
              </p>

              <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                Everything organized around the inspection process.
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                MetriCheck provides tools that help inspection officers move
                through the inspection process in a consistent and traceable
                way.
              </p>

            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              {capabilities.map(
                ({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-md"
                  >

                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="mt-5 font-semibold text-slate-900">
                      {title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {text}
                    </p>

                  </div>
                )
              )}

            </div>

          </div>
        </section>

        {/* ================= INSPECTION PROCESS ================= */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">

            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

              <div>

                <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
                  Inspection workflow
                </p>

                <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                  From product information to a final inspection statement.
                </h2>

                <p className="mt-5 leading-7 text-slate-600">
                  The inspection process is organized into clear stages so
                  officers can capture information, review findings and
                  complete the final report.
                </p>

              </div>

              <div className="space-y-3">

                {[
                  {
                    title: 'Product identification',
                    text: 'Scan, upload or manually enter product details.',
                  },
                  {
                    title: 'Package information',
                    text: 'Capture and review declarations and package details.',
                  },
                  {
                    title: 'Compliance evaluation',
                    text: 'Review applicable compliance requirements.',
                  },
                  {
                    title: 'Verification',
                    text: 'Review findings before completing the inspection.',
                  },
                  {
                    title: 'Final report',
                    text: 'Generate a clear final inspection statement.',
                  },
                ].map((item, index) => (
                  <div
                    key={item.title}
                    className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5"
                  >

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-bold text-teal-700">
                      {index + 1}
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {item.text}
                      </p>
                    </div>

                  </div>
                ))}

              </div>

            </div>

          </div>
        </section>

        {/* ================= WHY METRICHECK ================= */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">

              <div className="max-w-3xl">

                <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
                  Our focus
                </p>

                <h2 className="mt-3 text-3xl font-bold text-slate-900">
                  Clear information. Organized inspection. Traceable results.
                </h2>

                <p className="mt-5 leading-7 text-slate-600">
                  MetriCheck focuses on bringing the important parts of the
                  packaged commodity inspection workflow together so that
                  inspection information can be easier to capture, review and
                  communicate.
                </p>

              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">

                <div className="rounded-xl bg-slate-50 p-5">
                  <CheckCircle2 className="h-6 w-6 text-teal-600" />

                  <h3 className="mt-4 font-semibold text-slate-900">
                    Structured
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    A clear workflow from identification through reporting.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-5">
                  <ShieldCheck className="h-6 w-6 text-teal-600" />

                  <h3 className="mt-4 font-semibold text-slate-900">
                    Verifiable
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Inspection findings can be reviewed before finalization.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-5">
                  <FileCheck2 className="h-6 w-6 text-teal-600" />

                  <h3 className="mt-4 font-semibold text-slate-900">
                    Reportable
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Final inspection information is organized into a report.
                  </p>
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">

            <div className="rounded-2xl bg-teal-600 p-8 text-white sm:p-10">

              <h2 className="text-3xl font-bold">
                Explore the MetriCheck platform.
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-teal-50">
                Learn more about the platform or request access information
                for the inspection workflow.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">

                <Link
                  to="/request-demo"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-teal-700 hover:bg-teal-50"
                >
                  Request a demo
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-lg border border-teal-400 px-5 py-3 font-semibold text-white hover:bg-teal-700"
                >
                  Contact Us
                </Link>

              </div>

            </div>

          </div>
        </section>

      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>
              <div className="flex items-center gap-2.5">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
                  <ClipboardCheck className="h-5 w-5" />
                </div>

                <p className="font-bold text-slate-900">
                  MetriCheck
                </p>

              </div>

              <p className="mt-2 text-xs text-slate-500">
                Authorized inspection workflow for applicable packaged
                commodities.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">

              <Link
                to="/"
                className="text-slate-500 hover:text-slate-900"
              >
                Home
              </Link>

              <Link
                to="/about"
                className="text-teal-600"
              >
                About
              </Link>

              <Link
                to="/contact"
                className="text-slate-500 hover:text-slate-900"
              >
                Contact
              </Link>

              <Link
                to="/request-demo"
                className="text-slate-500 hover:text-slate-900"
              >
                Request Demo
              </Link>

              <Link
                to="/consumer-grievance"
                className="text-slate-500 hover:text-slate-900"
              >
                Consumer Grievance
              </Link>

              <Link
                to="/login"
                className="text-slate-500 hover:text-slate-900"
              >
                Officer Sign In
              </Link>

            </div>

          </div>

          <div className="mt-7 border-t border-slate-200 pt-6 text-xs text-slate-500">
            MetriCheck · Authorized inspection workflow for applicable
            packaged commodities.
          </div>

        </div>
      </footer>

    </div>
  );
}

