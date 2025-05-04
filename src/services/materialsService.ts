
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a file to the materials storage bucket and returns the URL
 */
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
    const fileName = `${classId}/${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      toast.error('Error uploading file');
      return null;
    }

    const { data } = supabase.storage.from('materials').getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadMaterial:', error);
    toast.error('Failed to upload material');
    return null;
  }
}

/**
 * Adds a material URL to the class's materials_url array
 */
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
      console.error('Error fetching class:', error);
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
      console.error('Error updating class:', updateError);
      toast.error('Error updating class materials');
      return false;
    }

    toast.success('Material added to class');
    return true;
  } catch (error) {
    console.error('Error in addMaterialToClass:', error);
    toast.error('Failed to add material to class');
    return false;
  }
}

/**
 * Removes a material URL from the class's materials_url array
 */
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
      console.error('Error fetching class:', error);
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
      console.error('Error updating class:', updateError);
      toast.error('Error removing class material');
      return false;
    }

    // Extract file path from URL
    const filePathMatch = materialUrl.match(/\/materials\/([^?]+)/);
    if (filePathMatch && filePathMatch[1]) {
      const filePath = filePathMatch[1];
      
      // Remove file from storage
      const { error: removeError } = await supabase.storage
        .from('materials')
        .remove([filePath]);
        
      if (removeError) {
        console.error('Error removing file from storage:', removeError);
        // We still return true since the URL was removed from the database
      }
    }

    toast.success('Material removed from class');
    return true;
  } catch (error) {
    console.error('Error in removeMaterialFromClass:', error);
    toast.error('Failed to remove material from class');
    return false;
  }
}
