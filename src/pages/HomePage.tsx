import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ScanLine,
  FileCheck2,
  MessageSquareWarning,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';

import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          {/* Logo */}
          <Link to="/home" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                MetriCheck
              </h1>
              <p className="text-xs text-slate-500">
                Packaged Commodity Compliance
              </p>
            </div>
          </Link>

          {/* Header buttons */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline">
                Sign in
              </Button>
            </Link>

            <Link to="/register">
              <Button>
                Register
              </Button>
            </Link>
          </div>

        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* Hero Section */}
        <section className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-12 text-white shadow-sm sm:px-10">

          <div className="max-w-3xl">

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              MetriCheck
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-teal-50 sm:text-base">
              A packaged commodity label compliance system that helps inspect
              product declarations, identify Legal Metrology compliance issues,
              and support consumer grievance reporting.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">

              <Link to="/inspections/new">
                <Button className="bg-white text-teal-700 hover:bg-teal-50">
                  <ScanLine className="h-4 w-4" />
                  Start inspection
                </Button>
              </Link>

              <Link to="/consumer-grievance">
                <Button
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10"
                >
                  <MessageSquareWarning className="h-4 w-4" />
                  Consumer Grievance
                </Button>
              </Link>

            </div>

            <p className="mt-4 text-xs text-teal-100">
              Sign in or register to access protected services.
            </p>

          </div>
        </section>

        {/* Services */}
        <section className="mt-10">

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              MetriCheck services
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Tools for packaged product inspection, compliance verification,
              and consumer grievance reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

            {/* Product Inspection */}
            <Card className="border-slate-200 bg-white transition-shadow hover:shadow-md">
              <CardBody>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
                  <ScanLine className="h-6 w-6 text-teal-600" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  Product inspection
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Upload packaged product images and extract label information
                  using OCR for compliance checking.
                </p>

                <Link
                  to="/inspections/new"
                  className="mt-6 inline-block"
                >
                  <Button variant="outline">
                    Start inspection
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

              </CardBody>
            </Card>

            {/* Compliance Verification */}
            <Card className="border-slate-200 bg-white transition-shadow hover:shadow-md">
              <CardBody>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                  <FileCheck2 className="h-6 w-6 text-emerald-600" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  Compliance verification
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Review extracted product declarations against the configured
                  Legal Metrology compliance rules.
                </p>

                <Link
                  to="/login"
                  className="mt-6 inline-block"
                >
                  <Button variant="outline">
                    Access verification
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

              </CardBody>
            </Card>

            {/* Consumer Grievance */}
            <Card className="border-amber-200 bg-amber-50/40 transition-shadow hover:shadow-md">
              <CardBody>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                  <MessageSquareWarning className="h-6 w-6 text-amber-600" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  Consumer Grievance
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Consumers can submit a grievance about a packaged product
                  when they believe its declarations or packaging may not
                  comply with applicable requirements.
                </p>

                <Link
                  to="/consumer-grievance"
                  className="mt-6 inline-block"
                >
                  <Button>
                    Submit grievance
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

              </CardBody>
            </Card>

          </div>
        </section>

        {/* How MetriCheck works */}
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">

          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-900">
              How MetriCheck works
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              The system supports the inspection process from product image
              scanning to compliance verification.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">

            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                1
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Upload product
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Upload images of the packaged product label.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                2
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Extract information
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  OCR extracts declarations and information visible on the
                  product packaging.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                3
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Verify compliance
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Extracted declarations can be reviewed against the configured
                  compliance requirements.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Consumer Grievance CTA */}
        <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <MessageSquareWarning className="h-6 w-6 text-amber-600" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Have a concern about a packaged product?
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Consumers can use the Consumer Grievance section to provide
                  product information, describe the issue, and submit a
                  complaint for review.
                </p>
              </div>

            </div>

            <Link to="/consumer-grievance">
              <Button>
                Consumer Grievance
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-200 py-6 text-center">

          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />

            <span className="font-semibold text-slate-900">
              MetriCheck
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Packaged Commodity Legal Metrology Compliance System
          </p>

        </footer>

      </main>
    </div>
  );
}