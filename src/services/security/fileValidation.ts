import { supabase } from '@/integrations/supabase/client';

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface FileValidationConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  maxFilesPerUser: number;
  scanForMalware: boolean;
}

const DEFAULT_CONFIG: FileValidationConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  maxFilesPerUser: 100,
  scanForMalware: true
};

// Known malicious file signatures (simplified)
const MALICIOUS_SIGNATURES = [
  'MZ', // PE executable
  '4D5A', // PE executable hex
  'PK\x03\x04', // ZIP with suspicious content patterns
];

export class FileValidationService {
  private config: FileValidationConfig;

  constructor(config: Partial<FileValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async validateFile(file: File, userId: string): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 1. File size validation
    if (file.size > this.config.maxFileSize) {
      result.isValid = false;
      result.errors.push(`File size ${this.formatFileSize(file.size)} exceeds maximum allowed size of ${this.formatFileSize(this.config.maxFileSize)}`);
    }

    // 2. MIME type validation
    if (!this.config.allowedMimeTypes.includes(file.type)) {
      result.isValid = false;
      result.errors.push(`File type '${file.type}' is not allowed`);
    }

    // 3. File name validation
    const sanitizedName = this.sanitizeFileName(file.name);
    if (sanitizedName !== file.name) {
      result.warnings.push('File name contains potentially unsafe characters and will be sanitized');
    }

    // 4. File content validation
    if (this.config.scanForMalware) {
      const contentCheck = await this.scanFileContent(file);
      if (!contentCheck.isValid) {
        result.isValid = false;
        result.errors.push(...contentCheck.errors);
      }
    }

    // 5. User file limit check
    const userFileCount = await this.getUserFileCount(userId);
    if (userFileCount >= this.config.maxFilesPerUser) {
      result.isValid = false;
      result.errors.push(`User has reached maximum file limit of ${this.config.maxFilesPerUser} files`);
    }

    // Log validation result
    await this.logValidation(file, userId, result);

    return result;
  }

  private async scanFileContent(file: File): Promise<{ isValid: boolean; errors: string[] }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        const header = Array.from(bytes.slice(0, 100))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Check for malicious signatures
        for (const signature of MALICIOUS_SIGNATURES) {
          if (header.includes(signature.toLowerCase())) {
            resolve({
              isValid: false,
              errors: ['File contains potentially malicious content']
            });
            return;
          }
        }

        // Additional content checks based on file type
        const suspiciousPatterns = [
          /javascript:/gi,
          /<script/gi,
          /eval\(/gi,
          /document\.cookie/gi
        ];

        const fileContent = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1000));
        
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(fileContent)) {
            resolve({
              isValid: false,
              errors: ['File contains potentially malicious script content']
            });
            return;
          }
        }

        resolve({ isValid: true, errors: [] });
      };

      reader.onerror = () => {
        resolve({
          isValid: false,
          errors: ['Failed to read file content for security scan']
        });
      };

      // Read only first 1MB for scanning
      const blob = file.slice(0, Math.min(file.size, 1024 * 1024));
      reader.readAsArrayBuffer(blob);
    });
  }

  private sanitizeFileName(fileName: string): string {
    // Remove or replace dangerous characters
    return fileName
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/^\.*/, '')
      .substring(0, 255);
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  private async getUserFileCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('class_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('student_name', userId); // This would need to be adjusted based on your schema

      if (error) {
        console.error('Error counting user files:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUserFileCount:', error);
      return 0;
    }
  }

  private async logValidation(
    file: File, 
    userId: string, 
    result: FileValidationResult
  ): Promise<void> {
    try {
      const status = result.isValid ? 'passed' : 'failed';
      const details = {
        originalName: file.name,
        errors: result.errors,
        warnings: result.warnings,
        fileType: file.type,
        timestamp: new Date().toISOString()
      };

      await supabase
        .from('file_validation_logs')
        .insert({
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          validation_status: status,
          validation_details: details,
          user_id: userId
        });
    } catch (error) {
      console.error('Failed to log file validation:', error);
      // Don't throw - logging failure shouldn't break file upload
    }
  }

  generateSecureFileName(originalName: string, userId: string): string {
    const sanitized = this.sanitizeFileName(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = sanitized.split('.').pop() || '';
    
    return `${userId}/${timestamp}_${random}.${extension}`;
  }
}

export const fileValidationService = new FileValidationService();