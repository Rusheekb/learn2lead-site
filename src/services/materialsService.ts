
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const log = logger.create('materials');

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

    const { data } = supabase.storage.from('materials').getPublicUrl(filePath);
    
    return data.publicUrl;
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
    const updatedUrls = existingUrls.filter(url => url !== materialUrl);

    const { error: updateError } = await supabase
      .from('scheduled_classes')
      .update({ materials_url: updatedUrls })
      .eq('id', classId);

    if (updateError) {
      log.error('Error updating class', updateError);
      toast.error('Error removing class material');
      return false;
    }

    const filePathMatch = materialUrl.match(/\/materials\/([^?]+)/);
    if (filePathMatch && filePathMatch[1]) {
      const filePath = filePathMatch[1];
      
      const { error: removeError } = await supabase.storage
        .from('materials')
        .remove([filePath]);
        
      if (removeError) {
        log.error('Error removing file from storage', removeError);
      }
    }

    toast.success('Material removed from class');
    return true;
  } catch (error) {
    log.error('Error in removeMaterialFromClass', error);
    toast.error('Failed to remove material from class');
    return false;
  }
}
