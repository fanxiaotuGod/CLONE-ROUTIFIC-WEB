import React from 'react';

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
}

const DeliveryDetailsPopup: React.FC<DeliveryDetailsPopupProps> = ({ delivery, onClose }) => {
  if (!delivery) return null;
  return (
    <div className="fixed top-20 left-72 z-50 w-96 max-w-full bg-white rounded-lg shadow-xl border border-gray-200 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
      <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={onClose}>&times;</button>
      <div className="flex items-center mb-4">
        <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${statusColors[delivery.status] || 'bg-gray-100 text-gray-800 border-gray-400'}`}>{delivery.status}</span>
        <span className="ml-3 text-xs text-gray-500">ETA: {delivery.eta}</span>
      </div>
      <h2 className="text-xl font-bold mb-1">{delivery.name}</h2>
      <div className="text-sm text-gray-700 mb-2">{delivery.address}</div>
      <div className="text-xs text-gray-500 mb-2">{delivery.email}</div>
      {delivery.photoUrl ? (
        <img src={delivery.photoUrl} alt="Proof of Delivery" className="w-full h-40 object-cover rounded mb-2 border" />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center rounded mb-2 border text-gray-400">No Photo</div>
      )}
      {delivery.notes && <div className="text-xs text-gray-600 mb-2">Notes: {delivery.notes}</div>}
    </div>
  );
};

export default DeliveryDetailsPopup; 