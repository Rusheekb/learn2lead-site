
import * as React from 'react';
import { cn } from '@/lib/utils';
import { useChart } from '../ChartContext';
import { getPayloadConfigFromPayload } from '../utils';

interface LegendItemProps {
  item: any;
  hideIcon?: boolean;
  nameKey?: string;
}

export function LegendItem({ item, hideIcon = false, nameKey }: LegendItemProps) {
  const { config } = useChart();
  const key = `${nameKey || item.dataKey || 'value'}`;
  const itemConfig = getPayloadConfigFromPayload(config, item, key);

  return (
    <div
      key={item.value}
      className={cn(
        'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground'
      )}
    >
      {itemConfig?.icon && !hideIcon ? (
        <itemConfig.icon />
      ) : (
        <div
          className="h-2 w-2 shrink-0 rounded-[2px]"
          style={{
            backgroundColor: item.color,
          }}
        />
      )}
      {itemConfig?.label}
    </div>
  );
}
