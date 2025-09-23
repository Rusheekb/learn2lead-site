// Dynamic imports for heavy libraries to reduce initial bundle size

export const importPdfLibrary = async () => {
  const [jsPDF, autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  return { jsPDF: jsPDF.default, autoTable };
};

export const importCsvLibrary = async () => {
  const Papa = await import('papaparse');
  return Papa.default;
};

export const importChartsLibrary = async () => {
  return await import('recharts');
};

export const importFileSaver = async () => {
  const fileSaver = await import('file-saver');
  return fileSaver;
};

// Preload critical libraries on user interaction
export const preloadLibraries = {
  pdf: () => importPdfLibrary(),
  csv: () => importCsvLibrary(),
  charts: () => importChartsLibrary(),
  fileSaver: () => importFileSaver(),
};

// Usage patterns for common operations
export const useDynamicPdf = () => {
  return async (content: any) => {
    const { jsPDF } = await importPdfLibrary();
    const doc = new jsPDF();
    // PDF operations
    return doc;
  };
};

export const useDynamicCsv = () => {
  return async (data: any[]) => {
    const Papa = await importCsvLibrary();
    return Papa.unparse(data);
  };
};