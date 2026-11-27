

export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return false;
  const csvContent = '\ufeff' + rows.map(row => row.map(value => {
    let stringVal = value === null || value === undefined ? '' : String(value);
    if (typeof value === 'string' && /^[\t\r ]*[=+\-@]/.test(stringVal)) stringVal = `'${stringVal}`;
    return `"${stringVal.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}


