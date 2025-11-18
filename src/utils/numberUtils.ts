
export const parseNumericString = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  
  // If already a number, just convert and return
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  // Strip currency symbols, commas, and whitespace from string
  const cleaned = value.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
