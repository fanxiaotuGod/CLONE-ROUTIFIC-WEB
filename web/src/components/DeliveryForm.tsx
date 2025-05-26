import React, { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export interface DeliveryFormData {
  name: string
  address: string
  email: string
  // Location, status, photoUrl, notes are removed as they will be handled by backend or are not part of initial form
}

interface DeliveryFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: DeliveryFormData) => void
  initialData?: Partial<Pick<DeliveryFormData, 'name' | 'address' | 'email'>> // For editing, only these fields
}

const DeliveryForm: React.FC<DeliveryFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || '')
      setAddress(initialData.address || '')
      setEmail(initialData.email || '')
    } else if (isOpen && !initialData) {
      // Reset form when opened for new entry
      setName('')
      setAddress('')
      setEmail('')
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !address.trim() || !email.trim()) {
      alert('Name, Address, and Email are required.') // Basic validation
      return
    }
    onSubmit({
      name,
      address,
      email,
    })
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {initialData?.name ? 'Edit Delivery' : 'Add New Delivery'}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name / Description</label>
              <input type="text" name="name" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full Address</label>
              <input type="text" name="address" id="address" value={address} onChange={e => setAddress(e.target.value)} required placeholder="e.g., 123 Main St, Vancouver, BC" className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
              <input type="email" name="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-gray-400 dark:focus:ring-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-primary-500 transition-colors"
              >
                {initialData?.name ? 'Save Changes' : 'Add Delivery'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export default DeliveryForm 