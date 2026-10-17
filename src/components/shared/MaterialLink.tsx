import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSignedMaterialUrl } from '@/services/materialsService';

type MaterialLinkProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  /** A stored material reference (path or legacy link). */
  reference: string;
};

/**
 * A link to a class material in the private `materials` bucket. The link is
 * signed when shown (valid for an hour) and re-signed before it expires.
 */
const MaterialLink = React.forwardRef<HTMLAnchorElement, MaterialLinkProps>(
  ({ reference, children, ...props }, ref) => {
    const { data: url, isError } = useQuery({
      queryKey: ['material-url', reference],
      queryFn: () => getSignedMaterialUrl(reference),
      staleTime: 50 * 60_000,
      refetchInterval: 50 * 60_000,
      retry: 1,
    });
    return (
      <a
        ref={ref}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!url}
        title={isError ? 'This file is no longer available' : undefined}
        {...props}
      >
        {children}
      </a>
    );
  }
);
MaterialLink.displayName = 'MaterialLink';

export default MaterialLink;
