
/**
 * Copies text to clipboard
 * @param text Text to copy to clipboard
 * @returns Promise that resolves to true if the operation was successful
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // For secure contexts (HTTPS)
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for non-secure contexts or older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy text: ', error);
    return false;
  }
};
