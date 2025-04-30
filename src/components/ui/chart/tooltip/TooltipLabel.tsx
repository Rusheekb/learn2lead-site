
import * as React from 'react';
import { cn } from '@/lib/utils';
import { useChart } from '../ChartContext';
import { getPayloadConfigFromPayload } from '../utils';

interface TooltipLabelProps {
  payload?: any[];
  label?: string;
  labelKey?: string;
  hideLabel?: boolean;
  labelClassName?: string;
  labelFormatter?: (value: any, payload?: any[]) => React.ReactNode;
}

export function TooltipLabel({
  payload,
  label,
  labelKey,
  hideLabel = false,
  labelClassName,
  labelFormatter,
}: TooltipLabelProps) {
  const { config } = useChart();

  if (hideLabel || !payload?.length) {
    return null;
  }

  const [item] = payload;
  const key = `${labelKey || item.dataKey || item.name || 'value'}`;
  const itemConfig = getPayloadConfigFromPayload(config, item, key);
  const value =
    !labelKey && typeof label === 'string'
      ? config[label as keyof typeof config]?.label || label
      : itemConfig?.label;

  if (labelFormatter) {
    return (
      <div className={cn('font-medium', labelClassName)}>
        {labelFormatter(value, payload)}
      </div>
    );
  }

  if (!value) {
    return null;
  }

  return <div className={cn('font-medium', labelClassName)}>{value}</div>;
}
