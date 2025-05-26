import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

const statusColors: Record<string, string> = {
  'Completed': 'bg-green-100 text-green-800 border-green-400',
  'In Progress': 'bg-yellow-100 text-yellow-800 border-yellow-400',
  'Failed': 'bg-red-100 text-red-800 border-red-400',
  'Pending': 'bg-gray-100 text-gray-800 border-gray-400',
};

interface DeliveryDetailsPopupProps {
  delivery: {
    id: string;
    name: string;
    address: string;
    email: string;
    status: string;
    eta: string;
    photoUrl?: string;
    notes?: string;
  } | null;
  onClose: () => void;
  onDeleteDelivery?: (deliveryId: string) => void;
}

const DeliveryDetailsPopup: React.FC<DeliveryDetailsPopupProps> = ({ delivery, onClose, onDeleteDelivery }) => {
  if (!delivery) return null;

  const handleDeleteClick = () => {
    onDeleteDelivery?.(delivery.id);
  };

  return (
    <div id="delivery-details-popup" className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-96 max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${statusColors[delivery.status] || 'bg-gray-100 dark:bg-slate-600 text-gray-800 dark:text-slate-200 border-gray-400 dark:border-slate-500'}`}>{delivery.status}</span>
          <span className="ml-3 text-xs text-gray-500 dark:text-slate-400">ETA: {delivery.eta}</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200" onClick={onClose} title="Close">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
        </button>
      </div>
      <h2 className="text-xl font-bold mb-1 text-gray-800 dark:text-slate-100">{delivery.name}</h2>
      <div className="text-sm text-gray-700 dark:text-slate-300 mb-2">{delivery.address}</div>
      <div className="text-xs text-gray-500 dark:text-slate-400 mb-3">{delivery.email}</div>
      
      <div className="mb-3">
        {delivery.photoUrl ? (
          <img src={delivery.photoUrl} alt="Proof of Delivery" className="w-full h-40 object-cover rounded border border-gray-200 dark:border-slate-600" />
        ) : (
          <div className="w-full h-40 bg-gray-100 dark:bg-slate-700 flex items-center justify-center rounded border border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500">No Photo</div>
        )}
      </div>
      
      {delivery.notes && <div className="text-xs text-gray-600 dark:text-slate-400 mb-4 p-2 bg-gray-50 dark:bg-slate-700/50 rounded">Notes: {delivery.notes}</div>}

      {onDeleteDelivery && (
        <button 
          onClick={handleDeleteClick}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600"
        >
          <TrashIcon className="h-4 w-4 mr-2" /> Delete Delivery
        </button>
      )}
    </div>
  );
};

export default DeliveryDetailsPopup; 