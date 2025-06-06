import React from 'react';

interface FinalizeModalProps {
  open: boolean;
  onClose: () => void;
  onFinalize: () => void;
  error?: string;
  summary?: string;
}

const EMAIL_TEMPLATE = `Subject: Your Upcoming Delivery Details\n\nDear {CUSTOMER_NAME},\n\nWe hope you're having a great day!\n\nThis is a confirmation for your upcoming delivery scheduled on **{DELIVERY_DATE}**.\nYour estimated time of arrival (ETA) is **{ETA}**.\n\nHere is a quick summary of your delivery:\n{SUMMARY}\n\nIf you have any questions or need to update your delivery preferences, feel free to contact us at support@demo-routific.com or reply to this email.\n\nThank you for choosing Demo-Routific!\n\nWarm regards,\nHaocheng Fan\nDemo-Routific, Vancouver BC`;

const FinalizeModal: React.FC<FinalizeModalProps> = ({ open, onClose, onFinalize, error, summary }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative animate-fade-in">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Finalize & Send Emails</h2>
        <div className="mb-4 text-gray-700">
          <p>Are you sure you want to finalize routes and send emails to all customers?</p>
          {summary && <p className="mt-1 text-sm">Summary: {summary}</p>}
          <p className="mt-2 text-sm text-gray-500">Below is the email template that will be used for all customers. Dynamic fields will be filled automatically.</p>
        </div>
        <pre className="bg-gray-50 border rounded p-3 text-xs overflow-x-auto mb-4 whitespace-pre-wrap text-gray-800">{EMAIL_TEMPLATE}</pre>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <div className="flex justify-end space-x-3 mt-4">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={onFinalize} className="btn btn-primary" disabled={!!error}>Finalize & Send</button>
        </div>
      </div>
    </div>
  );
};

export default FinalizeModal; 