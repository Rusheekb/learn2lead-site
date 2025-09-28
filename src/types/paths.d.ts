// Path mapping declarations to support @/ alias
declare module '@/*' {
  const value: any;
  export default value;
}

// This helps TypeScript understand the @/ path alias when baseUrl is not available
declare module '@/components/*';
declare module '@/hooks/*';
declare module '@/services/*';
declare module '@/types/*';
declare module '@/utils/*';
declare module '@/assets/*';
declare module '@/lib/*';
declare module '@/contexts/*';
declare module '@/pages/*';
declare module '@/constants/*';
declare module '@/integrations/*';