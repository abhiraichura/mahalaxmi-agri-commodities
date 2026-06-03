import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Search, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../hooks/useAuthStore';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function PartyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addParty, updateParty, parties } = useAppStore();
  const [gstLoading, setGstLoading] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);

  const existingParty = id ? parties.find(p => p.id === id) : null;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: existingParty || {
      type: 'buyer',
      brokeragePercent: 0.5,
      brokerageFixed: 0
    }
  });

  const verifyGST = async () => {
    const gstin = watch('gstin');
    if (!gstin || gstin.length !== 15) {
      toast.error('Please enter a valid 15-digit GSTIN');
      return;
    }

    setGstLoading(true);
    try {
      const response = await fetch(`https://sheet.gstincheck.co.in/check/${gstin}`);
      const data = await response.json();

      if (data?.taxpayerInfo) {
        const info = data.taxpayerInfo;
        const addr = info.pradr?.addr || {};

        setValue('legalName', info.lgnm || '');
        setValue('address', `${addr.bno || ''} ${addr.st || ''} ${addr.loc || ''}`.trim());
        setValue('city', addr.city || addr.dst || '');
        setValue('state', addr.stcd || '');
        setValue('pincode', addr.pncd || '');

        setGstVerified(true);
        toast.success('GST verified successfully!');
      } else {
        toast.error('Could not verify GSTIN');
      }
    } catch (error) {
      toast.error('GST verification failed');
    } finally {
      setGstLoading(false);
    }
  };

  const onSubmit = (data: any) => {
    if (id) {
      updateParty(id, { ...data, updatedAt: new Date() });
      toast.success('Party updated successfully!');
    } else {
      addParty({
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      toast.success('Party added successfully!');
    }
    navigate('/parties');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/parties')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {id ? 'Edit Party' : 'Add New Party'}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* GST Verification */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">GSTIN</label>
            <div className="flex gap-2">
              <input
                {...register('gstin', { required: true })}
                placeholder="24XXXXXXXXXXA1Z5"
                maxLength={15}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <button
                type="button"
                onClick={verifyGST}
                disabled={gstLoading}
                className="px-4 py-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-100 disabled:opacity-50 flex items-center gap-2"
              >
                {gstLoading ? (
                  <div className="w-4 h-4 border-2 border-rose-700/30 border-t-rose-700 rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Verify
              </button>
            </div>
            {gstVerified && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                GST Verified
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Legal Name *</label>
              <input
                {...register('legalName', { required: true })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Display Name</label>
              <input
                {...register('name')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Address</label>
            <textarea
              {...register('address')}
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">City</label>
              <input
                {...register('city')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">State</label>
              <input
                {...register('state')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Pincode</label>
              <input
                {...register('pincode')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Phone</label>
              <input
                {...register('phone')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">PAN Number</label>
              <input
                {...register('pan')}
                maxLength={10}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Party Type</label>
              <select
                {...register('type')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Brokerage %</label>
              <input
                {...register('brokeragePercent', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Fixed Brokerage (₹)</label>
              <input
                {...register('brokerageFixed', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/parties')}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {id ? 'Update Party' : 'Save Party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
