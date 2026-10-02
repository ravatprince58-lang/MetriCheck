import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Mail,
  MessageSquare,
  Phone,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const updateField = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.subject.trim() ||
      !form.message.trim()
    ) {
      return;
    }

    /*
     * This page currently does not have a backend contact-message
     * endpoint. Therefore we do not pretend that the message was
     * sent to a server.
     */
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <ClipboardCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="font-bold text-slate-900">MetriCheck</p>
              <p className="text-xs text-slate-500">Inspector</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Home
            </Link>

            <Link
              to="/about"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              About
            </Link>

            <Link
              to="/contact"
              className="text-sm font-medium text-teal-600"
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

          <Link
            to="/login"
            className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-700 md:hidden"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                Contact MetriCheck
              </span>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Get in touch with us.
              </h1>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Have a question about the platform, inspection workflow or
                access process? Send us your message.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8 lg:py-16">
            {/* Contact information */}
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Mail className="h-5 w-5" />
                </div>

                <h2 className="mt-4 font-semibold text-slate-900">
                  Email
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Use the contact form to send your enquiry.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Phone className="h-5 w-5" />
                </div>

                <h2 className="mt-4 font-semibold text-slate-900">
                  Support
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  For platform access and inspection workflow questions,
                  provide the relevant details in your message.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <MessageSquare className="h-5 w-5" />
                </div>

                <h2 className="mt-4 font-semibold text-slate-900">
                  Public enquiries
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Consumers with packaged-commodity concerns can use the
                  dedicated grievance form.
                </p>

                <Link
                  to="/consumer-grievance"
                  className="mt-4 inline-block text-sm font-semibold text-teal-600 hover:text-teal-700"
                >
                  Consumer Grievance →
                </Link>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                {submitted ? (
                  <div className="py-10 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>

                    <h2 className="mt-5 text-2xl font-bold text-slate-900">
                      Message Ready
                    </h2>

                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                      Thank you for providing your contact details and
                      message. The contact form is currently not connected
                      to a backend submission service.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setForm({
                          name: '',
                          email: '',
                          subject: '',
                          message: '',
                        });
                      }}
                      className="mt-6 text-sm font-semibold text-teal-600 hover:text-teal-700"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        Send us a message
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Fill in the details below.
                      </p>
                    </div>

                    <form
                      onSubmit={handleSubmit}
                      className="mt-7 space-y-5"
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Input
                          label="Name"
                          value={form.name}
                          onChange={(event) =>
                            updateField('name', event.target.value)
                          }
                          placeholder="Enter your name"
                          required
                        />

                        <Input
                          label="Email"
                          type="email"
                          value={form.email}
                          onChange={(event) =>
                            updateField('email', event.target.value)
                          }
                          placeholder="Enter your email"
                          required
                        />
                      </div>

                      <Input
                        label="Subject"
                        value={form.subject}
                        onChange={(event) =>
                          updateField('subject', event.target.value)
                        }
                        placeholder="Enter your subject"
                        required
                      />

                      <Textarea
                        label="Message"
                        value={form.message}
                        onChange={(event) =>
                          updateField('message', event.target.value)
                        }
                        placeholder="Write your message..."
                        rows={6}
                        required
                      />

                      <div className="flex justify-end">
                        <Button type="submit">
                          <span className="flex items-center gap-2">
                            Send Message
                            <Send className="h-4 w-4" />
                          </span>
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="font-bold text-slate-900">MetriCheck</p>

            <div className="flex gap-5 text-sm">
              <Link
                to="/"
                className="text-slate-500 hover:text-slate-900"
              >
                Home
              </Link>

              <Link
                to="/about"
                className="text-slate-500 hover:text-slate-900"
              >
                About
              </Link>

              <Link
                to="/request-demo"
                className="text-slate-500 hover:text-slate-900"
              >
                Request Demo
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}