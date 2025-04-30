
import * as RechartsPrimitive from 'recharts';

export * from './ChartContainer';
export * from './ChartContext';
export * from './ChartTooltipContent';
export * from './ChartLegendContent';
export * from './ChartStyle';
export * from './types';
export * from './utils';
export * from './tooltip/TooltipLabel';
export * from './tooltip/TooltipItem';
export * from './tooltip/TooltipIndicator';
export * from './legend/LegendItem';

// Export the Recharts tooltip and legend components
const ChartTooltip = RechartsPrimitive.Tooltip;
const ChartLegend = RechartsPrimitive.Legend;

export { ChartTooltip, ChartLegend };
