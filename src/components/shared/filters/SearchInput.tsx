
import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchInputProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  searchTerm,
  setSearchTerm,
  placeholder = 'Search...',
  className,
  ariaLabel,
}) => {
  const inputId = React.useId();
  const clearBtnId = React.useId();
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <label htmlFor={inputId} className="sr-only">
          {ariaLabel || placeholder}
        </label>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
        <Input
          id={inputId}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tutoring-blue dark:focus-visible:ring-tutoring-teal"
          aria-label={ariaLabel || placeholder}
          type="search"
        />
      </div>
      {searchTerm && (
        <Button
          id={clearBtnId}
          variant="ghost"
          size="icon"
          onClick={() => setSearchTerm('')}
          className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tutoring-blue dark:focus-visible:ring-tutoring-teal"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
};

export default SearchInput;
