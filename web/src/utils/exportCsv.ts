import { Route, Delivery } from '../hooks/useRoutes';

type CsvData = {
  'Driver Name': string;
  'Stop Sequence': number;
  'Customer Name': string;
  'Address': string;
  'Status': string;
  'ETA': string;
};

export const exportRoutesToCsv = (routes: Route[]) => {
  const data: CsvData[] = [];

  routes.forEach((route: Route) => {
    // We don't want to export the "Unassigned" route or empty routes
    if (route.driverId && route.deliveries.length > 0) {
      route.deliveries.forEach((delivery: Delivery, index: number) => {
        data.push({
          'Driver Name': route.driverName,
          'Stop Sequence': index + 1,
          'Customer Name': delivery.name,
          'Address': delivery.address,
          'Status': delivery.status,
          'ETA': delivery.eta,
        });
      });
    }
  });

  if (data.length === 0) {
    // Here you might want to show a notification to the user
    console.warn("No data to export.");
    return;
  }

  // Convert array of objects to CSV string
  const csvRows = [];
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + (row as any)[header]).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvString = csvRows.join('\n');

  // Create a blob and trigger download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'routes.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 