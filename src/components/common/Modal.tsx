
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCancel?: boolean;
  cancelText?: string;
  onCancel?: () => void;
  showConfirm?: boolean;
  confirmText?: string;
  onConfirm?: () => void;
  isConfirmLoading?: boolean;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  maxWidth?: string;
  maxHeight?: string;
  ariaLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  showCancel = false,
  cancelText = "Cancel",
  onCancel,
  showConfirm = false,
  confirmText = "Confirm",
  onConfirm,
  isConfirmLoading = false,
  confirmVariant = "default",
  className = "",
  maxWidth = "max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl", // Updated for better responsiveness
  maxHeight = "max-h-[95vh]",
  ariaLabel,
}) => {
  const titleId = React.useId();
  const descriptionId = React.useId();
  
  // Custom handler to prevent modal from closing when clicking outside
  const handleOpenChange = (open: boolean) => {
    // Only allow closing if it's an explicit user action through a button
    // This prevents the modal from closing when clicking outside
    if (!open && onCancel) {
      onCancel();
    } else if (!open) {
      // Do nothing - prevent auto-close when clicking outside
    } else {
      onOpenChange(true);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleOpenChange}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      modal={true} // Ensure modal behavior
    >
      <DialogContent 
        className={`${maxWidth} ${maxHeight} overflow-y-auto mx-4 w-[calc(100vw-2rem)] sm:w-auto bg-white px-4 sm:px-8 py-6 sm:py-10 ${className}`} // Improved responsive padding
        aria-label={ariaLabel}
        // Prevent click outside from closing
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        // Prevent escape key from closing
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
        {(title || description) && (
          <DialogHeader className="pb-4 sm:pb-6"> 
            {title && <DialogTitle id={titleId} className="text-xl sm:text-2xl text-gray-900 break-words">{title}</DialogTitle>}
            {description && <DialogDescription id={descriptionId} className="text-gray-600 break-words">{description}</DialogDescription>}
          </DialogHeader>
        )}
        
        <div className="overflow-y-auto text-gray-900 my-4 sm:my-8"> 
          {children}
        </div>
        
        {(footer || showCancel || showConfirm) && (
          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-10"> 
            {footer || (
              <>
                {showCancel && (
                  <Button 
                    variant="outline" 
                    onClick={() => onCancel ? onCancel() : onOpenChange(false)} 
                    className="w-full sm:w-auto bg-white text-gray-900 border-gray-300 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tutoring-blue"
                    aria-label={cancelText}
                  >
                    {cancelText}
                  </Button>
                )}
                {showConfirm && (
                  <Button 
                    variant={confirmVariant} 
                    onClick={onConfirm}
                    disabled={isConfirmLoading}
                    className="w-full sm:w-auto bg-tutoring-blue hover:bg-tutoring-blue/90 text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tutoring-blue"
                    aria-label={isConfirmLoading ? "Loading..." : confirmText}
                  >
                    {isConfirmLoading ? "Loading..." : confirmText}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
