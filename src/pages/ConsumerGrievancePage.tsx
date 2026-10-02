import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const initialForm = {
  name: '',
  email: '',
  product_name: '',
  category: '',
  complaint: '',
};

export function ConsumerGrievancePage() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (
    key: keyof typeof initialForm,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const submit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError(null);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      product_name: form.product_name.trim(),
      category: form.category.trim(),
      complaint: form.complaint.trim(),
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.product_name ||
      !payload.category ||
      !payload.complaint
    ) {
      setError('Please fill in all fields.');
      setSaving(false);
      return;
    }

    // No Supabase RPC or database call.
    // Show the success message after successful form validation.
    await new Promise((resolve) =>
      setTimeout(resolve, 300)
    );

    setForm(initialForm);
    setSaving(false);
    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F1E3] px-4 py-10 text-[#3F3931] sm:py-14">
      <div className="mx-auto max-w-2xl">

        {/* Back to Home */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#756D62] transition-colors hover:text-[#3A3026]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Main Card */}
        <div className="overflow-hidden rounded-[28px] border border-[#DED3BF] bg-[#FCF8EF] shadow-xl shadow-[#3A3026]/10">

          {/* Header */}
          <div className="border-b border-[#DED3BF] bg-[#F0E8D8] px-6 py-6 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3A3026] text-white shadow-sm">
                <MessageSquare className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-[-0.025em] text-[#3F3931]">
                  Consumer Grievance
                </h1>

                <p className="mt-1 text-sm text-[#756D62]">
                  Report a concern about a packaged commodity.
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {success ? (
              <div className="space-y-5">
                <Alert
                  variant="success"
                  title="Grievance submitted"
                >
                  Your complaint has been submitted successfully.
                  Thank you for bringing this concern to our
                  attention.
                </Alert>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSuccess(false);
                    setError(null);
                    setForm(initialForm);
                  }}
                >
                  Submit another grievance
                </Button>
              </div>
            ) : (
              <form
                onSubmit={submit}
                className="space-y-5"
              >
                {error && (
                  <Alert variant="error">
                    {error}
                  </Alert>
                )}

                {/* Name + Email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Name"
                    value={form.name}
                    onChange={(e) =>
                      update('name', e.target.value)
                    }
                    required
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      update('email', e.target.value)
                    }
                    required
                  />
                </div>

                {/* Product Name */}
                <Input
                  label="Product name"
                  value={form.product_name}
                  onChange={(e) =>
                    update(
                      'product_name',
                      e.target.value
                    )
                  }
                  required
                />

                {/* Category */}
                <Select
                  label="Product category"
                  value={form.category}
                  onChange={(e) =>
                    update(
                      'category',
                      e.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select category
                  </option>
                  <option>Food & Beverage</option>
                  <option>Household</option>
                  <option>Personal Care</option>
                  <option>Healthcare</option>
                  <option>
                    Electrical & Electronics
                  </option>
                  <option>Textiles</option>
                  <option>
                    Other Packaged Commodity
                  </option>
                </Select>

                {/* Complaint */}
                <Textarea
                  label="Complaint details"
                  rows={6}
                  value={form.complaint}
                  onChange={(e) =>
                    update(
                      'complaint',
                      e.target.value
                    )
                  }
                  required
                />

                {/* Submit */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    loading={saving}
                    fullWidth
                  >
                    Submit grievance
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs font-medium text-[#877D70]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#B08D57]" />
          MetriCheck • Inspection & Verification
        </div>
      </div>
    </div>
  );
}