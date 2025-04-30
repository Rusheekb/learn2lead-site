
import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';
import { TooltipLabel } from './tooltip/TooltipLabel';
import { TooltipItem } from './tooltip/TooltipItem';

// Remove the 'export' keyword from the initial declaration
const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<'div'> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: 'line' | 'dot' | 'dashed';
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const tooltipLabel = React.useMemo(() => {
      return (
        <TooltipLabel
          payload={payload}
          label={label}
          labelKey={labelKey}
          hideLabel={hideLabel}
          labelClassName={labelClassName}
          labelFormatter={labelFormatter}
        />
      );
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      labelKey,
    ]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== 'dot';

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => (
            <TooltipItem
              key={item.dataKey}
              item={item}
              index={index}
              indicator={indicator}
              nameKey={nameKey}
              hideIndicator={hideIndicator}
              formatter={formatter}
              nestLabel={nestLabel}
              tooltipLabel={tooltipLabel}
              color={color}
            />
          ))}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltip';

// Export the component
export { ChartTooltipContent };
