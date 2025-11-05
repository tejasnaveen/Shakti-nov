import React, { useState, useMemo } from 'react';
import { Eye, Phone, Copy } from 'lucide-react';
import { CustomerCase, ColumnConfig } from './types';
import { getDPDColor, copyToClipboard, filterCases, paginateCases, getTotalPages, debounce } from './utils';

interface CustomerCaseTableProps {
  customerCases: CustomerCase[];
  columnConfigs: ColumnConfig[];
  isLoading: boolean;
  onViewDetails: (caseData: CustomerCase) => void;
  onCallCustomer: (caseData: CustomerCase) => void;
  onUpdateStatus: (caseData: CustomerCase) => void;
}

const CustomerCaseTable: React.FC<CustomerCaseTableProps> = ({
  customerCases,
  columnConfigs,
  isLoading,
  onViewDetails,
  onCallCustomer,
  onUpdateStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((...args: unknown[]) => setSearchTerm(args[0] as string), 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    debouncedSearch(term);
    setCurrentPage(1); // Reset to first page on search
  };

  // Filter and paginate cases
  const filteredCases = useMemo(() =>
    filterCases(customerCases, searchTerm),
    [customerCases, searchTerm]
  );

  const totalPages = getTotalPages(filteredCases.length, itemsPerPage);
  const paginatedCases = useMemo(() =>
    paginateCases(filteredCases, currentPage, itemsPerPage),
    [filteredCases, currentPage, itemsPerPage]
  );

  const getActiveColumns = (): ColumnConfig[] => {
    const columns = columnConfigs.length > 0
      ? columnConfigs.map(config => ({
          id: config.id,
          columnName: config.columnName,
          displayName: config.displayName,
          isActive: config.isActive
        }))
      : [];

    columns.push({ id: 999, columnName: 'actions', displayName: 'Actions', isActive: true });
    return columns;
  };

  const renderColumnValue = (case_: CustomerCase, column: ColumnConfig) => {
    switch (column.columnName) {
      case 'dpd':
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDPDColor(case_.dpd)}`}>
            {case_.dpd} days
          </span>
        );
      case 'paymentLink':
        return (
          <button
            onClick={() => copyToClipboard(case_.paymentLink)}
            className="inline-flex items-center px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded transition-colors"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy Link
          </button>
        );
      case 'actions':
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => onViewDetails(case_)}
              className="text-purple-600 hover:text-purple-900 inline-flex items-center text-xs"
              title="View Details"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </button>
            <button
              onClick={() => onCallCustomer(case_)}
              className="text-green-600 hover:text-green-900 inline-flex items-center text-xs"
              title="Call Customer"
            >
              <Phone className="w-3 h-3 mr-1" />
              Call
            </button>
            <button
              onClick={() => onUpdateStatus(case_)}
              className="text-blue-600 hover:text-blue-900 text-xs"
              title="Update Status"
            >
              Update
            </button>
          </div>
        );
      default:
        const caseRecord = case_ as unknown as Record<string, unknown>;
        const value = caseRecord[column.columnName];
        return (
          <span className={
            column.columnName.includes('Amount') || column.columnName.includes('Dues')
              ? column.columnName === 'outstandingAmount' || column.columnName === 'pendingDues'
                ? 'font-medium text-red-600'
                : 'font-medium text-gray-900'
              : 'text-gray-900'
          }>
            {String(value || '-')}
          </span>
        );
    }
  };

  const exportToCSV = () => {
    const activeColumnsList = getActiveColumns().filter(col => col.isActive && col.columnName !== 'actions');
    const headers = activeColumnsList.map(col => col.displayName).join(',');
    const rows = filteredCases.map(case_ =>
      activeColumnsList.map(col => {
        const caseRecord = case_ as unknown as Record<string, unknown>;
        const value = caseRecord[col.columnName] || '';
        return `"${String(value)}"`;
      }).join(',')
    ).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer-cases.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Customer Cases</h3>
            <p className="text-sm text-gray-600 mt-1">Manage and track your assigned loan recovery cases</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportToCSV}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center"
            >
              <Copy className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search by name, loan ID, or mobile..."
              onChange={handleSearchChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-80"
            />
            <span className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredCases.length)} of {filteredCases.length} cases
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {getActiveColumns().filter(col => col.isActive).map((column) => (
                  <th key={column.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={getActiveColumns().length} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mr-2"></div>
                      Loading cases...
                    </div>
                  </td>
                </tr>
              ) : paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={getActiveColumns().length} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm ? 'No cases match your search criteria' : 'No cases assigned yet'}
                  </td>
                </tr>
              ) : (
                paginatedCases.map((case_, index) => (
                  <tr key={case_.id || index} className="hover:bg-gray-50">
                    {getActiveColumns().filter(col => col.isActive).map((column) => (
                      <td key={column.id} className="px-4 py-4 whitespace-nowrap text-sm">
                        {renderColumnValue(case_, column)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-700 rounded-md text-sm font-medium"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === page
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-700 rounded-md text-sm font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerCaseTable;