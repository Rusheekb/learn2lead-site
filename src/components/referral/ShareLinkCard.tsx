import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { copyToClipboard } from '@/utils/clipboardUtils';
import { toast } from 'sonner';
import { Copy, QrCode, Download, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ShareLinkCardProps {
  referralCode: string;
  referralUrl: string;
}

const ShareLinkCard: React.FC<ShareLinkCardProps> = ({
  referralCode,
  referralUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralUrl);
    if (success) {
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-code-svg') as HTMLElement;
    if (!canvas) return;

    // Create a canvas element to convert SVG to PNG
    const svgElement = canvas.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const downloadCanvas = document.createElement('canvas');
      downloadCanvas.width = 256;
      downloadCanvas.height = 256;
      const ctx = downloadCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 256, 256);
        ctx.drawImage(img, 0, 0, 256, 256);
        
        const link = document.createElement('a');
        link.download = `learn2lead-referral-${referralCode}.png`;
        link.href = downloadCanvas.toDataURL('image/png');
        link.click();
      }
      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;

    toast.success('QR code downloaded!');
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Your Referral Link
          </label>
          <div className="flex gap-2">
            <Input
              value={referralUrl}
              readOnly
              className="text-sm bg-muted/50 font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={showQR} onOpenChange={setShowQR}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 gap-2">
                <QrCode className="h-4 w-4" />
                Show QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Your Referral QR Code</DialogTitle>
                <DialogDescription>
                  Share this QR code with friends for easy signup
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div
                  id="qr-code-svg"
                  className="bg-white p-4 rounded-lg shadow-sm"
                >
                  <QRCodeSVG
                    value={referralUrl}
                    size={200}
                    level="H"
                    includeMargin
                    imageSettings={{
                      src: '/favicon.ico',
                      x: undefined,
                      y: undefined,
                      height: 24,
                      width: 24,
                      excavate: true,
                    }}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Scan to get <span className="font-semibold">$25 off</span> your first month
                </p>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={handleDownloadQR}
                    className="flex-1 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    onClick={handleCopyLink}
                    className="flex-1 gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShareLinkCard;
