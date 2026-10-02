import { supabase } from '@/lib/supabase';

export async function logAction(
  action: string,
  entityType: string = '',
  entityId?: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata,
    });

    if (error) {
      console.warn('Audit log failed:', error.message);
    }
  } catch (error) {
    console.warn('Audit logging failed:', error);
  }
}