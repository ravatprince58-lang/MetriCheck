import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ArrowRight } from 'lucide-react';

const productCategories = [
  'Packaged Food & Beverage',
  'Household Goods',
  'Personal Care & Cosmetics',
  'Pharmaceuticals & Healthcare',
  'Electrical & Electronics',
  'Hardware & Tools',
  'Textiles & Garments',
  'Automotive Products',
  'Stationery & Office Supplies',
  'Toys & General Merchandise',
  'Other Packaged Commodity',
];

export function NewInspectionPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    product_name: '',
    brand_name: '',
    product_category: '',
    inspection_type: 'Packaged Commodity Label Compliance Inspection',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const combinedNotes = [
      formData.brand_name && `Brand: ${formData.brand_name}`,
      formData.notes,
    ].filter(Boolean).join('\n');
    const { data, error } = await supabase
      .from('inspections')
      .insert({
        product_name: formData.product_name || 'Untitled product',
        product_category: formData.product_category,
        inspection_type: formData.inspection_type,
        notes: combinedNotes,
        status: 'draft',
      })
      .select()
      .single();

    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data) {
      await logAction('inspection_created', 'inspection', data.id, {
        product_name: data.product_name,
        product_category: data.product_category,
      });
      navigate(`/inspections/${data.id}/upload`);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New inspection</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the product details to begin a packaged commodity label compliance inspection.</p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2 text-sm">
        <div className="flex items-center gap-2 text-teal-600 font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white text-xs">1</span>
          Product details
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">2</span>
          Image upload
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">3</span>
          OCR / Product info
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">4</span>
          Compliance
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">5</span>
          Verification
        </div>
        <div className="h-px flex-1 bg-slate-200 max-w-12" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs">6</span>
          Report
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Product information</CardTitle>
        </CardHeader>
        <CardBody>
          {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Product name"
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={(e) => handleChange('product_name', e.target.value)}
              placeholder="e.g. RINGS MASALA"
            />
            <Input
              label="Brand name"
              type="text"
              name="brand_name"
              value={formData.brand_name || ''}
              onChange={(e) => handleChange('brand_name', e.target.value)}
              placeholder="e.g. CRAX"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Select
                label="Product category"
                name="product_category"
                value={formData.product_category}
                onChange={(e) => handleChange('product_category', e.target.value)}
              >
                <option value="">Select category</option>
                {productCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </Select>
              <Input
                label="Inspection type"
                type="text"
                name="inspection_type"
                value={formData.inspection_type}
                onChange={(e) => handleChange('inspection_type', e.target.value)}
                placeholder="e.g. Packaged commodity label compliance"
              />
            </div>
            <Textarea
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional context about this inspection..."
              rows={4}
            />
            <div className="rounded-lg bg-sky-50 border border-sky-200 p-3">
              <p className="text-xs text-sky-700">
                Package declarations applicable to the selected commodity will be extracted from uploaded package images using OCR. If OCR cannot read a declaration, you can enter it manually during review.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Continue to upload
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </AppLayout>
  );
}
