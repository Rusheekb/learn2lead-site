import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const log = logger.create('materials');

/**
 * Class materials live in the private `materials` bucket. A class stores a
 * reference per file: a storage path ("<class id>/<file>"), or — for files
 * added before the bucket went private — the old public link, which still
 * contains the path. These helpers accept either.
 */
export function materialPath(reference: string): string {
  const match = reference.match(
    /\/object\/(?:public|sign|authenticated)\/materials\/([^?]+)/
  );
  return match ? decodeURIComponent(match[1]) : reference;
}

/** The file name to show for a material reference. */
export function materialFileName(reference: string): string {
  const name = materialPath(reference).split('/').pop() ?? reference;
  return name || reference;
}

/** A link that opens a class material for the next hour. */
export async function getSignedMaterialUrl(reference: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('materials')
    .createSignedUrl(materialPath(reference), 3600);
  if (error || !data?.signedUrl) {
    log.error('Could not open material', error);
    throw error ?? new Error('Could not open this file.');
  }
  return data.signedUrl;
}

export async function uploadMaterial(
  file: File,
  classId: string
): Promise<string | null> {
  try {
    if (!file) {
      toast.error('No file selected');
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${classId}/${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(filePath, file);

    if (uploadError) {
      log.error('Error uploading file', uploadError);
      toast.error('Error uploading file');
      return null;
    }

    // The bucket is private: store the path; links are signed when opened.
    return filePath;
  } catch (error) {
    log.error('Error in uploadMaterial', error);
    toast.error('Failed to upload material');
    return null;
  }
}

export async function addMaterialToClass(
  classId: string,
  materialUrl: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('scheduled_classes')
      .select('materials_url')
      .eq('id', classId)
      .single();

    if (error) {
      log.error('Error fetching class', error);
      toast.error('Error updating class materials');
      return false;
    }

    const existingUrls = data.materials_url || [];
    const updatedUrls = [...existingUrls, materialUrl];

    const { error: updateError } = await supabase
      .from('scheduled_classes')
      .update({ materials_url: updatedUrls })
      .eq('id', classId);

    if (updateError) {
      log.error('Error updating class', updateError);
      toast.error('Error updating class materials');
      return false;
    }

    toast.success('Material added to class');
    return true;
  } catch (error) {
    log.error('Error in addMaterialToClass', error);
    toast.error('Failed to add material to class');
    return false;
  }
}

export async function removeMaterialFromClass(
  classId: string,
  materialUrl: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('scheduled_classes')
      .select('materials_url')
      .eq('id', classId)
      .single();

    if (error) {
      log.error('Error fetching class', error);
      toast.error('Error updating class materials');
      return false;
    }

    const existingUrls = data.materials_url || [];
    const updatedUrls = existingUrls.filter((url) => url !== materialUrl);

    const { error: updateError } = await supabase
      .from('scheduled_classes')
      .update({ materials_url: updatedUrls })
      .eq('id', classId);

    if (updateError) {
      log.error('Error updating class', updateError);
      toast.error('Error removing class material');
      return false;
    }

    const { error: removeError } = await supabase.storage
      .from('materials')
      .remove([materialPath(materialUrl)]);

    if (removeError) {
      log.error('Error removing file from storage', removeError);
    }

    toast.success('Material removed from class');
    return true;
  } catch (error) {
    log.error('Error in removeMaterialFromClass', error);
    toast.error('Failed to remove material from class');
    return false;
  }
}
