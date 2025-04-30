
import * as RechartsPrimitive from 'recharts';

export * from './ChartContainer';
export * from './ChartContext';
export * from './ChartTooltipContent';
export * from './ChartLegendContent';
export * from './ChartStyle';
export * from './types';
export * from './utils';

// Export the Recharts tooltip and legend directly
const ChartTooltip = RechartsPrimitive.Tooltip;
const ChartLegend = RechartsPrimitive.Legend;

export { ChartTooltip, ChartLegend };
