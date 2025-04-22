import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[] | string[];
  placeholder: string;
  allOptionLabel?: string;
  className?: string;
}

// Helper function to ensure we never have empty values in SelectItems
const ensureValidValue = (
  value: string | undefined,
  prefix: string
): string => {
  if (!value || value.trim() === '') {
    return `${prefix}-${Date.now()}`;
  }
  return value;
};

const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder,
  allOptionLabel = 'All',
  className,
}) => {
  // Transform string arrays to option objects if needed
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      const safeValue = ensureValidValue(opt, placeholder.toLowerCase());
      return { value: safeValue, label: opt || 'Unknown' };
    }
    return {
      value: ensureValidValue(opt.value, placeholder.toLowerCase()),
      label: opt.label || 'Unknown',
    };
  });

  return (
    <div className={className}>
      <Select value={value || 'all'} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allOptionLabel}</SelectItem>
          {normalizedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FilterSelect;
