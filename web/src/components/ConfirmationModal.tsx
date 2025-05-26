import React from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  isDestructive = true,
}) => {
  if (!isOpen) return null;

  const confirmButtonBaseClasses = "px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 transition-colors";
  const confirmButtonColors = isDestructive 
    ? "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500"
    : "text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500";
  
  const cancelButtonColors = "text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 focus:ring-gray-400 dark:focus:ring-slate-500";

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <Dialog.Title className={`flex items-center text-lg font-semibold ${isDestructive ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-slate-100'}`}>
              {isDestructive && <ExclamationTriangleIcon className="h-6 w-6 mr-2" />}
              {title}
            </Dialog.Title>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="text-sm text-gray-700 dark:text-slate-300 mb-6">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>

          <div className="flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose} 
              className={`${confirmButtonBaseClasses} ${cancelButtonColors}`}
            >
              {cancelButtonText}
            </button>
            <button 
              type="button" 
              onClick={() => { onConfirm(); onClose(); }} // Important: Call onClose after onConfirm
              className={`${confirmButtonBaseClasses} ${confirmButtonColors}`}
            >
              {confirmButtonText}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ConfirmationModal; 