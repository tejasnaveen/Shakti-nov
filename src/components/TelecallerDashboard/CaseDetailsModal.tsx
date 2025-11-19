import React from 'react';
import { X, User, Phone, MapPin, Calendar, DollarSign, FileText } from 'lucide-react';
import { CustomerCase } from './types';

interface CaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: CustomerCase | null;
}

export const CaseDetailsModal: React.FC<CaseDetailsModalProps> = ({ isOpen, onClose, caseData }) => {
  if (!isOpen || !caseData) return null;

  const DetailRow = ({ label, value, icon: Icon }: { label: string; value: string; icon: any }) => (
    <div className="flex items-start py-3 border-b border-gray-100">
      <div className="flex items-center w-1/3">
        <Icon className="w-4 h-4 text-gray-400 mr-2" />
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="w-2/3">
        <span className="text-sm text-gray-900">{value || '-'}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="w-6 h-6 text-white mr-3" />
            <h3 className="text-xl font-bold text-white">Case Details</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-purple-600" />
                Customer Information
              </h4>
              <DetailRow icon={User} label="Name" value={caseData.customerName} />
              <DetailRow icon={Phone} label="Mobile" value={caseData.mobileNo} />
              <DetailRow icon={Phone} label="Alternate" value={caseData.alternateNumber} />
              <DetailRow icon={FileText} label="Email" value={caseData.email} />
              <DetailRow icon={MapPin} label="Address" value={caseData.address} />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Loan Information
              </h4>
              <DetailRow icon={FileText} label="Loan ID" value={caseData.loanId} />
              <DetailRow icon={FileText} label="Loan Type" value={caseData.loanType} />
              <DetailRow icon={DollarSign} label="Loan Amount" value={caseData.loanAmount} />
              <DetailRow icon={DollarSign} label="Outstanding" value={caseData.outstandingAmount} />
              <DetailRow icon={DollarSign} label="EMI Amount" value={caseData.emiAmount} />
              <DetailRow icon={DollarSign} label="Pending Dues" value={caseData.pendingDues} />
            </div>
          </div>

          <div className="mt-6 space-y-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Payment History
            </h4>
            <DetailRow icon={Calendar} label="Sanction Date" value={caseData.sanctionDate} />
            <DetailRow icon={Calendar} label="Last Paid Date" value={caseData.lastPaidDate} />
            <DetailRow icon={DollarSign} label="Last Paid Amount" value={caseData.lastPaidAmount} />
            <DetailRow icon={FileText} label="Branch" value={caseData.branchName} />
          </div>

          {caseData.dpd !== undefined && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Days Past Due (DPD)</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  caseData.dpd <= 30 ? 'bg-green-100 text-green-800' :
                  caseData.dpd <= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {caseData.dpd} days
                </span>
              </div>
            </div>
          )}

          {caseData.remarks && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Remarks</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{caseData.remarks}</p>
              </div>
            </div>
          )}

          {caseData.paymentLink && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment Link</h4>
              <div className="bg-blue-50 rounded-lg p-4">
                <a
                  href={caseData.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all"
                >
                  {caseData.paymentLink}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
