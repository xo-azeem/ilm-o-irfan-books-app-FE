import { supabase } from '@/lib/supabase';

export type PdfAccessPolicy = {
  /** null = server has not answered yet (or the table is missing). */
  allowPdfWithoutEntitlement: boolean | null;
};

export async function getPdfAccessPolicy(): Promise<PdfAccessPolicy> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('allow_pdf_without_entitlement')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return { allowPdfWithoutEntitlement: null };
  }

  const value = (data as { allow_pdf_without_entitlement?: unknown })
    .allow_pdf_without_entitlement;
  if (typeof value !== 'boolean') {
    return { allowPdfWithoutEntitlement: null };
  }

  return { allowPdfWithoutEntitlement: value };
}

export async function setPdfAccessPolicy(allowPdfWithoutEntitlement: boolean) {
  const { error } = await supabase
    .from('app_settings')
    .update({ allow_pdf_without_entitlement: allowPdfWithoutEntitlement })
    .eq('id', 1);

  if (error) {
    throw new Error(error.message);
  }
}
