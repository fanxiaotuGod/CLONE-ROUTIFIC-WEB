import React from 'react';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

const statusColors: Record<string, string> = {
  'Completed': 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300 border-green-400',
  'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300 border-yellow-400',
  'Failed': 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-red-400',
  'Pending': 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300 border-gray-400',
  'Scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-400',
};

interface DeliveryDetailsPanelProps {
  delivery: {
    id: string;
    name: string;
    address: string;
    email?: string;
    status: string;
    eta: string;
    photoUrl?: string;
    notes?: string;
  } | null;
  onClose: () => void;
  onDeleteDelivery?: (deliveryId: string) => void;
}

const DeliveryDetailsPanel: React.FC<DeliveryDetailsPanelProps> = ({ delivery, onClose, onDeleteDelivery }) => {
  if (!delivery) return null;

  const handleDeleteClick = () => {
    onDeleteDelivery?.(delivery.id);
  };

  return (
    <div 
      id="delivery-details-panel" 
      className="fixed top-16 left-0 z-30 w-96 h-[calc(100vh-4rem)] bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-2xl border-r border-gray-200 dark:border-slate-700 flex flex-col p-6 animate-slide-in-left"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{delivery.name}</h2>
          <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">Delivery Details</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200" onClick={onClose} title="Close">
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        <div className="space-y-4">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold ${statusColors[delivery.status] || statusColors['Pending']}`}>{delivery.status}</span>
            <span className="ml-3 text-xs text-gray-500 dark:text-slate-400">ETA: {delivery.eta}</span>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Address</h3>
            <p className="text-sm text-gray-800 dark:text-slate-200">{delivery.address}</p>
          </div>

          {delivery.email && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Contact</h3>
              <p className="text-sm text-gray-800 dark:text-slate-200">{delivery.email}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Proof of Delivery</h3>
            {delivery.photoUrl ? (
              <img src={delivery.photoUrl} alt="Proof of Delivery" className="w-full h-40 object-cover rounded border border-gray-200 dark:border-slate-600" />
            ) : (
              <div className="w-full h-40 bg-gray-100 dark:bg-slate-700 flex items-center justify-center rounded border border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500">No Photo Uploaded</div>
            )}
          </div>
          
          {delivery.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Notes</h3>
              <div className="text-sm text-gray-600 dark:text-slate-400 p-3 bg-gray-50 dark:bg-slate-700/50 rounded">{delivery.notes}</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      {onDeleteDelivery && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <button 
            onClick={handleDeleteClick}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600"
          >
            <TrashIcon className="h-4 w-4 mr-2" /> Delete Delivery
          </button>
        </div>
      )}
    </div>
  );
};

export default DeliveryDetailsPanel; 