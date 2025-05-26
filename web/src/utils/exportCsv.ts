export function exportRoutesToCsv(routes: any[]) {
  const headers = ['Route', 'Driver', 'Name', 'Address', 'Email', 'Status', 'ETA'];
  const rows = [headers];
  routes.forEach(route => {
    route.deliveries.forEach((d: any) => {
      rows.push([
        route.id,
        route.driver,
        d.name,
        d.address,
        d.email,
        d.status,
        d.eta,
      ]);
    });
  });
  const csvContent = rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'routes_export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 