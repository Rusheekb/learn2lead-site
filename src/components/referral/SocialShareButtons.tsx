import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { copyToClipboard } from '@/utils/clipboardUtils';
import { 
  Twitter, 
  Facebook, 
  MessageCircle, 
  Mail, 
  Smartphone, 
  Link2, 
  Share2 
} from 'lucide-react';

interface SocialShareButtonsProps {
  referralCode: string;
  referralUrl: string;
  discountAmount?: number;
  className?: string;
  variant?: 'icons' | 'buttons';
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
  referralCode,
  referralUrl,
  discountAmount = 25,
  className = '',
  variant = 'icons',
}) => {
  const shareMessage = `I'm learning with Learn2Lead tutoring! Use my referral code ${referralCode} for $${discountAmount} off your first month. Sign up here: ${referralUrl}`;
  
  const encodedMessage = encodeURIComponent(shareMessage);
  const encodedUrl = encodeURIComponent(referralUrl);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm learning with @Learn2Lead! Use my code ${referralCode} for $${discountAmount} off 🎓`)}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(`Use my referral code ${referralCode} for $${discountAmount} off tutoring!`)}`,
    whatsapp: `https://wa.me/?text=${encodedMessage}`,
    email: `mailto:?subject=${encodeURIComponent(`Get $${discountAmount} off tutoring with Learn2Lead!`)}&body=${encodedMessage}`,
    sms: `sms:?body=${encodedMessage}`,
  };

  const handleShare = async (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralUrl);
    if (success) {
      toast.success('Referral link copied to clipboard!');
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Get $${discountAmount} off tutoring!`,
          text: `Use my referral code ${referralCode} for $${discountAmount} off your first month of tutoring.`,
          url: referralUrl,
        });
        toast.success('Thanks for sharing!');
      } catch (error) {
        // User cancelled or share failed silently
        if ((error as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  if (variant === 'icons') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare('twitter')}
          className="hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]"
          title="Share on Twitter/X"
        >
          <Twitter className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare('facebook')}
          className="hover:bg-[#4267B2]/10 hover:text-[#4267B2] hover:border-[#4267B2]"
          title="Share on Facebook"
        >
          <Facebook className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare('whatsapp')}
          className="hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]"
          title="Share on WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare('email')}
          className="hover:bg-muted"
          title="Share via Email"
        >
          <Mail className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleShare('sms')}
          className="hover:bg-muted md:hidden"
          title="Share via SMS"
        >
          <Smartphone className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopyLink}
          className="hover:bg-muted"
          title="Copy Link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        {'share' in navigator && (
          <Button
            variant="default"
            size="icon"
            onClick={handleNativeShare}
            className="md:hidden"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${className}`}>
      <Button
        variant="outline"
        onClick={() => handleShare('twitter')}
        className="gap-2 hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]"
      >
        <Twitter className="h-4 w-4" />
        Twitter
      </Button>
      <Button
        variant="outline"
        onClick={() => handleShare('facebook')}
        className="gap-2 hover:bg-[#4267B2]/10 hover:text-[#4267B2] hover:border-[#4267B2]"
      >
        <Facebook className="h-4 w-4" />
        Facebook
      </Button>
      <Button
        variant="outline"
        onClick={() => handleShare('whatsapp')}
        className="gap-2 hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </Button>
      <Button
        variant="outline"
        onClick={() => handleShare('email')}
        className="gap-2"
      >
        <Mail className="h-4 w-4" />
        Email
      </Button>
      <Button
        variant="outline"
        onClick={handleCopyLink}
        className="gap-2"
      >
        <Link2 className="h-4 w-4" />
        Copy Link
      </Button>
      {'share' in navigator && (
        <Button
          variant="default"
          onClick={handleNativeShare}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      )}
    </div>
  );
};

export default SocialShareButtons;
