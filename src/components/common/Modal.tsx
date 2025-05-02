
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
  maxWidth = "max-w-xl",
  maxHeight = "max-h-[80vh]",
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`${maxWidth} ${maxHeight} overflow-y-auto mx-4 w-[calc(100vw-2rem)] sm:w-auto ${className}`}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle className="text-xl break-words">{title}</DialogTitle>}
            {description && <DialogDescription className="break-words">{description}</DialogDescription>}
          </DialogHeader>
        )}
        
        <div className="overflow-y-auto">
          {children}
        </div>
        
        {(footer || showCancel || showConfirm) && (
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
            {footer || (
              <>
                {showCancel && (
                  <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                    {cancelText}
                  </Button>
                )}
                {showConfirm && (
                  <Button 
                    variant={confirmVariant} 
                    onClick={onConfirm}
                    disabled={isConfirmLoading}
                    className="w-full sm:w-auto"
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
