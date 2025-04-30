
import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';
import { LegendItem } from './legend/LegendItem';

// Remove the 'export' keyword from the initial declaration
const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> &
    Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey },
    ref
  ) => {
    if (!payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center gap-4',
          verticalAlign === 'top' ? 'pb-3' : 'pt-3',
          className
        )}
      >
        {payload.map((item) => (
          <LegendItem 
            key={item.value}
            item={item}
            hideIcon={hideIcon}
            nameKey={nameKey}
          />
        ))}
      </div>
    );
  }
);
ChartLegendContent.displayName = 'ChartLegend';

// Export the component
export { ChartLegendContent };
