import React from 'react';
import { Delivery } from '../hooks/useRoutes';
import { TruckIcon, TrashIcon } from '@heroicons/react/24/solid';

interface DeliveriesPageProps {
  deliveries: Delivery[];
  onDeleteDelivery: (deliveryId: string) => void;
}

const statusColors: Record<string, string> = {
  'Completed': 'bg-green-100 text-green-800',
  'Scheduled': 'bg-blue-100 text-blue-800',
  'Pending': 'bg-gray-100 text-gray-800',
};

const DeliveriesPage: React.FC<DeliveriesPageProps> = ({ deliveries, onDeleteDelivery }) => {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 mb-2">Deliveries</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-8">
          A complete list of all deliveries across all routes.
        </p>

        <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Address</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">ETA</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
              {deliveries.map(delivery => (
                <tr key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{delivery.name}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">{delivery.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">{delivery.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[delivery.status] || statusColors['Pending']}`}>
                      {delivery.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{delivery.eta}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => onDeleteDelivery(delivery.id)}
                      className="p-1 rounded-full text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title={`Delete delivery for ${delivery.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deliveries.length === 0 && (
            <div className="text-center p-12 text-gray-500 dark:text-slate-400">
              <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4">No deliveries found.</p>
              <p className="text-sm mt-1">Upload a CSV file to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveriesPage; 