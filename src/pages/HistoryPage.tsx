import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/audit';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { FilePlus2, ClipboardList, FileText, ChevronRight, RefreshCw, Trash2, Eye } from 'lucide-react';
import type { Inspection } from '@/types';

export function HistoryPage() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress' | 'draft'>('all');
  const [reinspectingId, setReinspectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setInspections(data as Inspection[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = inspections.filter((i) => filter === 'all' || i.status === filter);

  const handleReinspect = async (inspection: Inspection) => {
    setReinspectingId(inspection.id);
    const { data, error: insertError } = await supabase
      .from('inspections')
      .insert({
        product_name: inspection.product_name,
        product_category: inspection.product_category,
        manufacturer: inspection.manufacturer,
        batch_number: inspection.batch_number,
        inspection_type: inspection.inspection_type,
        notes: `Re-inspection of ${inspection.product_name || 'product'} (original: ${inspection.id.slice(0, 8).toUpperCase()}). ${(inspection.notes || '').trim()}`.trim(),
        status: 'draft',
      })
      .select()
      .single();

    setReinspectingId(null);
    if (insertError) {
      setError('Could not start re-inspection. Please try again.');
      return;
    }
    if (data) {
      await logAction('inspection_created', 'inspection', data.id, {
        product_name: (data as Inspection).product_name,
        reinspection_of: inspection.id,
      });
      navigate(`/inspections/${(data as Inspection).id}/upload`);
    }
  };

  const handleDelete = async (inspection: Inspection) => {
    if (!window.confirm(`Delete inspection "${inspection.product_name || 'Untitled product'}"? This will remove its images, OCR results and report.`)) return;
    setDeletingId(inspection.id);
    setError(null);
    const { error } = await supabase.from('inspections').delete().eq('id', inspection.id);
    setDeletingId(null);
    if (error) { setError('Could not delete inspection. Please try again.'); return; }
    await logAction('inspection_deleted', 'inspection', inspection.id, { product_name: inspection.product_name });
    setInspections((prev) => prev.filter((item) => item.id !== inspection.id));
  };

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'info'> = {
      completed: 'success',
      in_progress: 'warning',
      draft: 'info',
    };
    const label = status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
    return <Badge variant={map[status] || 'info'}>{label}</Badge>;
  };

  const filters = [
    { key: 'all' as const, label: 'All' },
    { key: 'completed' as const, label: 'Completed' },
    { key: 'in_progress' as const, label: 'In Progress' },
    { key: 'draft' as const, label: 'Drafts' },
  ];

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inspection history</h1>
          <p className="mt-1 text-sm text-slate-500">Browse and manage all your inspections.</p>
        </div>
        <Link to="/inspections/new">
          <Button>
            <FilePlus2 className="h-4 w-4" />
            New inspection
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardBody>
          {loading ? (
            <div className="py-12"><Spinner /></div>
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-12 w-12" />}
              title={filter === 'all' ? 'No inspections yet' : `No ${filter.replace('_', ' ')} inspections`}
              description={filter === 'all' ? 'Start your first inspection to see it here.' : 'Try a different filter or start a new inspection.'}
              action={{ label: 'New inspection', to: '/inspections/new' }}
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((inspection) => (
                <div
                  key={inspection.id}
                  className="flex items-center gap-4 rounded-lg border border-slate-200 p-4 hover:border-teal-300 hover:bg-teal-50/30 transition-colors group"
                >
                  <Link to={`/inspections/${inspection.id}/report`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 flex-shrink-0">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {inspection.product_name || 'Untitled product'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-slate-500">
                          {inspection.product_category || 'Uncategorized'}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">
                          {inspection.inspection_type || 'No type'}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">
                          {new Date(inspection.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {statusBadge(inspection.status)}
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {inspection.status === 'draft' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500" title="Drafts are read-only from history">
                        <Eye className="h-3.5 w-3.5" /> Read only
                      </span>
                    )}
                    {inspection.status === 'completed' && (
                      <button onClick={() => handleReinspect(inspection)} disabled={reinspectingId === inspection.id} title="Start re-inspection with same product details" className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-colors disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${reinspectingId === inspection.id ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(inspection)} disabled={deletingId === inspection.id} title="Delete inspection" className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50">
                      <Trash2 className={`h-4 w-4 ${deletingId === inspection.id ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </AppLayout>
  );
}
