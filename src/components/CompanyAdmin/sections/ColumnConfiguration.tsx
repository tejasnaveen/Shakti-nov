import React, { useState, useEffect } from 'react';
import { Columns, Plus, Save, Eye, EyeOff, Trash2, Building2, UserPlus, UserMinus, Eye as ViewIcon, RotateCcw } from 'lucide-react';
import { useProducts } from '../../../hooks/useProducts';
import { columnConfigService } from '../../../services/columnConfigService';
import { useNotification, notificationHelpers } from '../../shared/Notification';
import { PromptModal } from '../../shared/PromptModal';
import { ClearAllDataModal } from '../forms/ClearAllDataModal';
import { useConfirmation } from '../../../contexts/ConfirmationContext';

interface LocalColumn {
  id: string | number;
  columnName: string;
  displayName: string;
  isActive: boolean;
  isCustom?: boolean;
}

export const ColumnConfiguration: React.FC = () => {
  const { products, selectedProduct, setSelectedProduct, addProduct, deleteProduct } = useProducts();
  const { showNotification } = useNotification();
  const { showConfirmation } = useConfirmation();

  const [showPreview, setShowPreview] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [columns, setColumns] = useState<LocalColumn[]>([
    { id: '1', columnName: 'customerName', displayName: 'Customer Name', isActive: true },
    { id: '2', columnName: 'loanId', displayName: 'Loan ID', isActive: true },
    { id: '3', columnName: 'loanAmount', displayName: 'Loan Amount', isActive: true },
    { id: '4', columnName: 'mobileNo', displayName: 'Mobile No', isActive: true },
    { id: '5', columnName: 'dpd', displayName: 'DPD', isActive: true },
    { id: '6', columnName: 'outstanding', displayName: 'Outstanding', isActive: true },
    { id: '7', columnName: 'posAmount', displayName: 'POS Amount', isActive: true },
    { id: '8', columnName: 'emiAmount', displayName: 'EMI Amount', isActive: true },
    { id: '9', columnName: 'pendingDues', displayName: 'Pending Dues', isActive: true },
    { id: '10', columnName: 'paymentLink', displayName: 'Payment Link', isActive: true },
    { id: '11', columnName: 'branchName', displayName: 'Branch Name', isActive: true },
    { id: '12', columnName: 'loanType', displayName: 'Loan Type', isActive: true },
    { id: '13', columnName: 'actions', displayName: 'Actions', isActive: true }
  ]);
  const [customColumns, setCustomColumns] = useState<LocalColumn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCustomColumn, setNewCustomColumn] = useState({
    columnName: '',
    displayName: '',
    isActive: true
  });

  // Load columns when product changes
  useEffect(() => {
    if (selectedProduct && tenant?.id) {
      const loadProductColumns = async () => {
        try {
          setIsLoading(true);
          const configs = await columnConfigService.getColumnConfigurations(user.tenantId, selectedProduct);

          if (configs.length === 0) {
            // Initialize default columns if none exist
            await columnConfigService.initializeDefaultColumns(user.tenantId, selectedProduct);
            const newConfigs = await columnConfigService.getColumnConfigurations(user.tenantId, selectedProduct);
            setColumns(newConfigs.filter(c => !c.is_custom).map((c, idx) => ({
              id: idx + 1,
              columnName: c.column_name,
              displayName: c.display_name,
              isActive: c.is_active,
              isCustom: false
            })));
            setCustomColumns(newConfigs.filter(c => c.is_custom).map((c, idx) => ({
              id: newConfigs.filter(conf => !conf.is_custom).length + idx + 1,
              columnName: c.column_name,
              displayName: c.display_name,
              isActive: c.is_active,
              isCustom: true
            })));
          } else {
            setColumns(configs.filter(c => !c.is_custom).map((c, idx) => ({
              id: idx + 1,
              columnName: c.column_name,
              displayName: c.display_name,
              isActive: c.is_active,
              isCustom: false
            })));
            setCustomColumns(configs.filter(c => c.is_custom).map((c, idx) => ({
              id: configs.filter(conf => !conf.is_custom).length + idx + 1,
              columnName: c.column_name,
              displayName: c.display_name,
              isActive: c.is_active,
              isCustom: true
            })));
          }
        } catch (error) {
          console.error('Error loading columns:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadProductColumns();
    }
  }, [selectedProduct, tenant?.id]);

  const handleColumnToggle = (columnId: string | number, isActive: boolean, isCustom: boolean = false) => {
    if (isCustom) {
      setCustomColumns(prev => prev.map(col =>
        col.id === columnId ? { ...col, isActive } : col
      ));
    } else {
      setColumns(prev => prev.map(col =>
        col.id === columnId ? { ...col, isActive } : col
      ));
    }
  };

  const handleColumnRename = (columnId: string | number, displayName: string, isCustom: boolean = false) => {
    if (isCustom) {
      setCustomColumns(prev => prev.map(col =>
        col.id === columnId ? { ...col, displayName } : col
      ));
    } else {
      setColumns(prev => prev.map(col =>
        col.id === columnId ? { ...col, displayName } : col
      ));
    }
  };

  const handleAddCustomColumn = () => {
    if (newCustomColumn.columnName && newCustomColumn.displayName) {
      // Check for duplicate columnName
      const existingColumnNames = [...columns, ...customColumns].map(col => col.columnName);
      if (existingColumnNames.includes(newCustomColumn.columnName)) {
        showNotification(notificationHelpers.error(
          'Duplicate Column',
          `Column name "${newCustomColumn.columnName}" already exists. Please choose a unique name.`
        ));
        return;
      }

      const newColumn: LocalColumn = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        columnName: newCustomColumn.columnName,
        displayName: newCustomColumn.displayName,
        isActive: newCustomColumn.isActive,
        isCustom: true
      };

      setCustomColumns(prev => [...prev, newColumn]);
      setNewCustomColumn({ columnName: '', displayName: '', isActive: true });
      showNotification(notificationHelpers.success(
        'Column Added',
        `Custom column "${newColumn.displayName}" added successfully!`
      ));
    }
  };

  const handleRemoveCustomColumn = (columnId: string | number) => {
    const column = customColumns.find(col => col.id === columnId);
    if (!column) return;

    showConfirmation({
      title: 'Delete Custom Column',
      message: `Are you sure you want to delete the custom column "${column.displayName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        setCustomColumns(prev => prev.filter(col => col.id !== columnId));
        showNotification(notificationHelpers.success(
          'Column Deleted',
          `Custom column "${column.displayName}" has been deleted.`
        ));
      }
    });
  };

  const handleSaveConfiguration = async () => {
    if (!selectedProduct || !tenant?.id) return;

    try {
      setIsLoading(true);
      const allColumns = [
        ...columns.map((col, index) => ({
          column_name: col.columnName,
          display_name: col.displayName,
          is_active: col.isActive,
          is_custom: false,
          column_order: index + 1,
          data_type: 'text'
        })),
        ...customColumns.map((col, index) => ({
          column_name: col.columnName,
          display_name: col.displayName,
          is_active: col.isActive,
          is_custom: true,
          column_order: columns.length + index + 1,
          data_type: 'text'
        }))
      ];

      await columnConfigService.saveColumnConfigurations(user.tenantId, selectedProduct, allColumns);
      showNotification(notificationHelpers.success(
        'Configuration Saved',
        'Column configuration saved successfully!'
      ));
    } catch (error) {
      console.error('Error saving column configuration:', error);
      showNotification(notificationHelpers.error(
        'Save Failed',
        'Failed to save column configuration'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCompany = async (companyName: string) => {
    if (!tenant?.id) {
      showNotification(notificationHelpers.error(
        'Error',
        'Tenant not found. Please refresh the page.'
      ));
      return;
    }

    if (companyName && companyName.trim()) {
      try {
        await addProduct(companyName.trim(), user.tenantId);
        showNotification(notificationHelpers.success(
          'Company Added',
          `Company "${companyName}" added successfully!`
        ));
      } catch (error: any) {
        showNotification(notificationHelpers.error(
          'Failed to Add Company',
          error.message || 'Failed to add company'
        ));
      }
    }
  };

  const getActiveColumns = () => {
    const activeDefaults = columns.filter(col => col.isActive);
    const activeCustoms = customColumns.filter(col => col.isActive);
    return [...activeDefaults, ...activeCustoms];
  };

  const executeClearAllColumnData = async () => {
    if (!tenant?.id) {
      showNotification(notificationHelpers.error(
        'Error',
        'Tenant not found. Please refresh the page.'
      ));
      return;
    }

    try {
      setIsLoading(true);
      await columnConfigService.clearAllColumnConfigurations(user.tenantId);
      
      // Reset local state
      setColumns([
        { id: '1', columnName: 'customerName', displayName: 'Customer Name', isActive: true },
        { id: '2', columnName: 'loanId', displayName: 'Loan ID', isActive: true },
        { id: '3', columnName: 'loanAmount', displayName: 'Loan Amount', isActive: true },
        { id: '4', columnName: 'mobileNo', displayName: 'Mobile No', isActive: true },
        { id: '5', columnName: 'dpd', displayName: 'DPD', isActive: true },
        { id: '6', columnName: 'outstanding', displayName: 'Outstanding', isActive: true },
        { id: '7', columnName: 'posAmount', displayName: 'POS Amount', isActive: true },
        { id: '8', columnName: 'emiAmount', displayName: 'EMI Amount', isActive: true },
        { id: '9', columnName: 'pendingDues', displayName: 'Pending Dues', isActive: true },
        { id: '10', columnName: 'paymentLink', displayName: 'Payment Link', isActive: true },
        { id: '11', columnName: 'branchName', displayName: 'Branch Name', isActive: true },
        { id: '12', columnName: 'loanType', displayName: 'Loan Type', isActive: true },
        { id: '13', columnName: 'actions', displayName: 'Actions', isActive: true }
      ]);
      setCustomColumns([]);
      
      // Clear selected product
      setSelectedProduct('');
      
      showNotification(notificationHelpers.success(
        'All Column Data Cleared',
        'All column configurations have been successfully cleared!'
      ));
    } catch (error) {
      console.error('Error clearing column data:', error);
      showNotification(notificationHelpers.error(
        'Clear Failed',
        'Failed to clear column data. Please try again.'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllColumnData = async () => {
    if (!tenant?.id) {
      showNotification(notificationHelpers.error(
        'Error',
        'Tenant not found. Please refresh the page.'
      ));
      return;
    }

    setShowClearModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product-Wise Column Management</h2>
          <p className="text-sm text-gray-600 mt-1">Configure which columns to display for each product</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            onClick={handleClearAllColumnData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300"
            title="Clear all column data for this tenant"
          >
            <RotateCcw className="w-4 h-4" />
            {isLoading ? 'Clearing...' : 'Clear All Data'}
          </button>
          <button
            onClick={handleSaveConfiguration}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Product Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-end space-x-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Product
            </label>
            <div className="relative">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                {products.length > 0 ? (
                  products.map((product) => (
                    <option key={product} value={product}>{product}</option>
                  ))
                ) : (
                  <option disabled>Loading products...</option>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <Building2 className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
             <button
               onClick={() => setShowAddCompanyModal(true)}
               className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
               title="Add Product"
             >
               <UserPlus className="w-5 h-5" />
             </button>
             <button
               onClick={async () => {
                 if (!tenant?.id) {
                   showNotification(notificationHelpers.error(
                     'Error',
                     'Tenant not found. Please refresh the page.'
                   ));
                   return;
                 }

                 showConfirmation({
                   title: 'Delete Product',
                   message: `Are you sure you want to delete product "${selectedProduct}"? This will remove all associated configurations.`,
                   confirmText: 'Delete',
                   cancelText: 'Cancel',
                   type: 'danger',
                   onConfirm: async () => {
                     try {
                       await deleteProduct(selectedProduct, user.tenantId);
                       showNotification(notificationHelpers.success(
                         'Product Deleted',
                         `Product "${selectedProduct}" deleted successfully!`
                       ));
                     } catch (error: any) {
                       showNotification(notificationHelpers.error(
                         'Failed to Delete Product',
                         error.message || 'Failed to delete product'
                       ));
                     }
                   }
                 });
               }}
               className="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
               title="Delete Product"
               disabled={!selectedProduct}
             >
               <UserMinus className="w-5 h-5" />
             </button>
             <button
               onClick={() => {
                 showNotification(notificationHelpers.info(
                   'Product Details',
                   `Product: ${selectedProduct}\nStatus: Active\nLocation: N/A\nEmployees: N/A`
                 ));
                 console.log('View product details:', selectedProduct);
               }}
               className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
               title="View Product"
               disabled={!selectedProduct}
             >
               <ViewIcon className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>

      {/* Default Columns Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <Columns className="w-5 h-5 mr-2 text-green-600" />
            Default Columns
          </h4>
          <p className="text-gray-600 mt-1">Enable/disable and rename default system columns</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {columns.map((column, index) => (
              <div key={column.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={column.isActive}
                    onChange={(e) => handleColumnToggle(column.id, e.target.checked, false)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={column.displayName}
                    onChange={(e) => handleColumnRename(column.id, e.target.value, false)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    column.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {column.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Columns Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-purple-600" />
            Custom Columns
          </h4>
          <p className="text-gray-600 mt-1">Add your own custom columns for additional data</p>
        </div>
        <div className="p-6">
          {/* Add Custom Column Form */}
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Column Name</label>
                <input
                  type="text"
                  value={newCustomColumn.columnName}
                  onChange={(e) => setNewCustomColumn({...newCustomColumn, columnName: e.target.value})}
                  placeholder="e.g., branchCode"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                <input
                  type="text"
                  value={newCustomColumn.displayName}
                  onChange={(e) => setNewCustomColumn({...newCustomColumn, displayName: e.target.value})}
                  placeholder="e.g., Branch Code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddCustomColumn}
                  disabled={!newCustomColumn.columnName || !newCustomColumn.displayName}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add Column
                </button>
              </div>
            </div>
          </div>

          {/* Custom Columns List */}
          {customColumns.length > 0 ? (
            <div className="space-y-3">
              {customColumns.map((column, index) => (
                <div key={column.id || index} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={column.isActive}
                      onChange={(e) => handleColumnToggle(column.id, e.target.checked, true)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{column.displayName}</p>
                      <p className="text-sm text-gray-500">{column.columnName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      column.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {column.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleRemoveCustomColumn(column.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Delete custom column"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Columns className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No custom columns added yet</p>
              <p className="text-sm">Add custom columns using the form above</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Preview */}
      {showPreview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Eye className="w-5 h-5 mr-2 text-blue-600" />
              Live Preview - Telecaller Table
            </h4>
            <p className="text-gray-600 mt-1">This is how the table will appear to telecallers</p>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {getActiveColumns().map((column, index) => (
                      <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {column.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    {getActiveColumns().map((column, index) => (
                      <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {column.columnName === 'actions' ? (
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900 text-xs">Call</button>
                            <button className="text-green-600 hover:text-green-900 text-xs">Update</button>
                            <button className="text-purple-600 hover:text-purple-900 text-xs">View</button>
                          </div>
                        ) : (
                          'Sample Data'
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Configuration Summary for {selectedProduct}</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{getActiveColumns().length}</div>
            <div className="text-sm text-gray-600">Active Columns</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{columns.filter(c => c.isActive).length}</div>
            <div className="text-sm text-gray-600">Default Columns</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{customColumns.filter(c => c.isActive).length}</div>
            <div className="text-sm text-gray-600">Custom Columns</div>
          </div>
        </div>
      </div>

      {/* Add Company Modal */}
      <PromptModal
        isOpen={showAddCompanyModal}
        onClose={() => setShowAddCompanyModal(false)}
        onConfirm={handleAddCompany}
        title="Add New Product"
        message="Enter the name of the new product to add to your column configuration."
        placeholder="e.g., IDFC, HDFC Bank, ICICI Bank"
        confirmText="Add Product"
        cancelText="Cancel"
        required={true}
        validation={(value: string) => {
          if (value.trim().length < 2) {
            return 'Company name must be at least 2 characters long';
          }
          // Use only products from Supabase as single source of truth
          console.log('Validation check:', {
            input: value.trim(),
            products,
            exists: products.includes(value.trim())
          });
          if (products.includes(value.trim())) {
            return 'Product name already exists';
          }
          return null;
        }}
      />

      {/* Clear All Column Data Confirmation Modal */}
      <ClearAllDataModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={executeClearAllColumnData}
        isLoading={isLoading}
      />
    </div>
  );
};