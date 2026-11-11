

export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return false;
  const csvContent = '\ufeff' + rows.map(row => 
    row.map(val => {
      const stringVal = (val === null || val === undefined) ? '' : String(val);
      return `"${stringVal.replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}


