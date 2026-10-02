import { supabase } from '@/lib/supabase';

export interface ConsumerGrievance {
  id: string;
  reference_number: string;
  user_id: string | null;
  product_name: string;
  brand_name: string;
  product_category: string;
  issue_type: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConsumerGrievanceInput {
  product_name: string;
  brand_name: string;
  product_category: string;
  issue_type: string;
  description: string;
}

function generateReferenceNumber(): string {
  const timestamp = Date.now()
    .toString(36)
    .toUpperCase();

  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `GRV-${timestamp}-${random}`;
}

/**
 * Creates a consumer grievance directly in
 * the consumer_grievances table.
 *
 * This intentionally does NOT use:
 * submit_consumer_grievance(...)
 */
export async function createConsumerGrievance(
  data: CreateConsumerGrievanceInput
): Promise<ConsumerGrievance> {
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const referenceNumber =
    generateReferenceNumber();

  const { data: grievance, error } =
    await supabase
      .from('consumer_grievances')
      .insert({
        reference_number: referenceNumber,

        user_id:
          userData.user?.id ?? null,

        product_name:
          data.product_name.trim(),

        brand_name:
          data.brand_name.trim(),

        product_category:
          data.product_category.trim(),

        issue_type:
          data.issue_type.trim(),

        description:
          data.description.trim(),

        status: 'pending',
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  return grievance as ConsumerGrievance;
}

/**
 * Get all consumer grievances.
 */
export async function getConsumerGrievances(): Promise<
  ConsumerGrievance[]
> {
  const { data, error } =
    await supabase
      .from('consumer_grievances')
      .select(`
        id,
        reference_number,
        user_id,
        product_name,
        brand_name,
        product_category,
        issue_type,
        description,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', {
        ascending: false,
      });

  if (error) {
    throw error;
  }

  return (data ?? []) as ConsumerGrievance[];
}

/**
 * Update grievance status from Admin.
 */
export async function updateConsumerGrievanceStatus(
  id: string,
  status: string
): Promise<ConsumerGrievance> {
  const { data, error } =
    await supabase
      .from('consumer_grievances')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data as ConsumerGrievance;
}