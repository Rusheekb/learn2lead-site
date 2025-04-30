
import * as React from 'react';
import { cn } from '@/lib/utils';
import { useChart } from '../ChartContext';
import { getPayloadConfigFromPayload } from '../utils';
import { TooltipIndicator } from './TooltipIndicator';
import { TooltipLabel } from './TooltipLabel';

interface TooltipItemProps {
  item: any;
  index: number;
  indicator?: 'line' | 'dot' | 'dashed';
  nameKey?: string;
  hideIndicator?: boolean;
  formatter?: (value: any, name: string, item: any, index: number, payload: any) => React.ReactNode;
  nestLabel?: boolean;
  tooltipLabel?: React.ReactNode;
  color?: string;
}

export function TooltipItem({
  item,
  index,
  indicator = 'dot',
  nameKey,
  hideIndicator = false,
  formatter,
  nestLabel = false,
  tooltipLabel,
  color,
}: TooltipItemProps) {
  const { config } = useChart();
  
  const key = `${nameKey || item.name || item.dataKey || 'value'}`;
  const itemConfig = getPayloadConfigFromPayload(config, item, key);
  const indicatorColor = color || item.payload.fill || item.color;

  if (formatter && item?.value !== undefined && item.name) {
    return formatter(item.value, item.name, item, index, item.payload);
  }

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
        indicator === 'dot' && 'items-center'
      )}
    >
      {itemConfig?.icon ? (
        <itemConfig.icon />
      ) : (
        <TooltipIndicator
          indicator={indicator}
          color={indicatorColor}
          nestLabel={nestLabel}
          hideIndicator={hideIndicator}
        />
      )}
      
      <div
        className={cn(
          'flex flex-1 justify-between leading-none',
          nestLabel ? 'items-end' : 'items-center'
        )}
      >
        <div className="grid gap-1.5">
          {nestLabel ? tooltipLabel : null}
          <span className="text-muted-foreground">
            {itemConfig?.label || item.name}
          </span>
        </div>
        {item.value && (
          <span className="font-mono font-medium tabular-nums text-foreground">
            {item.value.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
