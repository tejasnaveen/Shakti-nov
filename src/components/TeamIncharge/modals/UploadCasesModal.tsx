import React, { useState, useEffect } from 'react';
import { Upload, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { columnConfigService, ColumnConfiguration } from '../../../services/columnConfigService';
import { customerCaseService } from '../../../services/customerCaseService';
import { excelUtils } from '../../../utils/excelUtils';
import { useNotification, notificationHelpers } from '../../shared/Notification';
import { useAuth } from '../../../contexts/AuthContext';
import { TeamService } from '../../../services/teamService';

interface UploadCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadCasesModal: React.FC<UploadCasesModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // Step states
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Product and Team selection
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [products, setProducts] = useState<string[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfiguration[]>([]);

  // Step 2: File upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Load products and teams
  useEffect(() => {
    if (isOpen && user?.tenantId && user?.id) {
      loadProductsAndTeams();
    }
  }, [isOpen, user?.tenantId, user?.id]);

  const loadProductsAndTeams = async () => {
    if (!user?.tenantId || !user?.id) {
      console.warn('User or tenant ID not available');
      return;
    }

    try {
      setIsLoading(true);

      // Get unique products from column configurations
      const configs = await columnConfigService.getColumnConfigurations(user.tenantId);
      const uniqueProducts = [...new Set(configs.map(c => c.product_name))];
      setProducts(uniqueProducts);

      // Get teams for this team incharge
      const teamData = await TeamService.getTeams(user.tenantId);
      const userTeams = teamData.filter((team: any) =>
        team.team_incharge_id === user.id && team.status === 'active'
      );
      setTeams(userTeams);
    } catch (error) {
      console.error('Error loading products and teams:', error);
      showNotification(notificationHelpers.error(
        'Error',
        'Failed to load products and teams'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = async (product: string) => {
    setSelectedProduct(product);
    setSelectedTeam('');
    
    try {
      const configs = await columnConfigService.getActiveColumnConfigurations(user.id, product);
      setColumnConfigs(configs);
    } catch (error) {
      console.error('Error loading column configurations:', error);
    }
  };

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeam(teamId);
  };

  const handleDownloadTemplate = () => {
    if (columnConfigs.length > 0) {
      excelUtils.generateTemplate(columnConfigs);
      showNotification(notificationHelpers.success(
        'Template Downloaded',
        'Excel template has been downloaded successfully'
      ));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showNotification(notificationHelpers.error(
        'Invalid File',
        'Please select a valid Excel file (.xlsx or .xls)'
      ));
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showNotification(notificationHelpers.error(
        'File Too Large',
        'File size should not exceed 10MB'
      ));
      return;
    }

    setUploadedFile(file);
  };

  const handleUploadCases = async () => {
    if (!uploadedFile || !selectedTeam || !selectedProduct || !tenant?.id || !user?.id) {
      showNotification(notificationHelpers.error(
        'Missing Data',
        'Please complete all required fields'
      ));
      return;
    }

    try {
      setIsLoading(true);
      setUploadProgress(0);

      // Parse Excel file
      const excelData = await excelUtils.parseExcelFile(uploadedFile, columnConfigs);
      
      if (excelData.length === 0) {
        throw new Error('No valid data found in Excel file');
      }

      if (excelData.length > 1000) {
        throw new Error('Maximum 1000 cases allowed per upload');
      }

      // Prepare cases for bulk insert
      const cases = excelData.map(row => ({
        tenant_id: user.tenantId,
        team_id: selectedTeam,
        product_name: selectedProduct,
        case_data: row,
        status: 'new' as const,
        uploaded_by: user.id
      }));

      // Validate each row
      const validationErrors: any[] = [];
      const validCases: typeof cases = [];

      excelData.forEach((row, index) => {
        const validation = excelUtils.validateCaseData(row, columnConfigs);
        if (validation.valid) {
          validCases.push(cases[index]);
        } else {
          validationErrors.push({
            row: index + 1,
            errors: validation.errors
          });
        }
      });

      if (validationErrors.length > 0) {
        showNotification(notificationHelpers.error(
          'Validation Errors',
          `${validationErrors.length} rows have validation errors`
        ));
        return;
      }

      // Upload cases
      setUploadProgress(50);
      const result = await customerCaseService.createBulkCases(validCases);
      setUploadProgress(100);
      setUploadResult(result);

      if (result.errors.length === 0) {
        showNotification(notificationHelpers.success(
          'Upload Successful',
          `Successfully uploaded ${result.totalUploaded} cases`
        ));
        onSuccess();
        handleClose();
      } else {
        showNotification(notificationHelpers.warning(
          'Upload Completed with Errors',
          `${result.errors.length} cases failed to upload`
        ));
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      showNotification(notificationHelpers.error(
        'Upload Failed',
        error.message || 'Failed to upload cases'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setCurrentStep(1);
    setSelectedProduct('');
    setSelectedTeam('');
    setColumnConfigs([]);
    setUploadedFile(null);
    setUploadProgress(0);
    setUploadResult(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-600" />
            Upload Cases
          </h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                <span className={`ml-2 text-sm ${
                  step <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {step === 1 ? 'Select Product & Team' : 
                   step === 2 ? 'Download & Upload Template' : 
                   'Review & Submit'}
                </span>
                {step < 3 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Step 1: Select Product & Team</h4>
                <p className="text-gray-600">Choose the product and team for case upload</p>
              </div>

              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Product *
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="">Choose a product...</option>
                  {products.map((product) => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              </div>

              {/* Team Selection */}
              {selectedProduct && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Team *
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => handleTeamSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    <option value="">Choose a team...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.telecallers?.length || 0} telecallers)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Column Configuration Preview */}
              {selectedProduct && columnConfigs.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">Column Configuration</h5>
                  <p className="text-blue-700 text-sm mb-3">
                    Template will include {columnConfigs.length} columns based on product configuration
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {columnConfigs.slice(0, 6).map((config) => (
                      <div key={config.id} className="text-xs bg-white rounded px-2 py-1">
                        {config.display_name}
                      </div>
                    ))}
                    {columnConfigs.length > 6 && (
                      <div className="text-xs text-blue-600 px-2 py-1">
                        +{columnConfigs.length - 6} more columns
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Next Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedProduct || !selectedTeam || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  Next: Download Template
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Step 2: Download Template & Upload</h4>
                <p className="text-gray-600">Download the Excel template, fill it with case data, and upload</p>
              </div>

              {/* Download Template */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h5 className="text-lg font-medium text-gray-900 mb-2">Download Excel Template</h5>
                  <p className="text-gray-600 mb-4">
                    Click below to download the template for {selectedProduct}
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                  >
                    <Download className="w-4 h-4 inline mr-2" />
                    Download Template
                  </button>
                </div>
              </div>

              {/* Upload File */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h5 className="text-lg font-medium text-gray-900 mb-2">Upload Filled Template</h5>
                  <p className="text-gray-600 mb-4">
                    Select the filled Excel template file
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors inline-block"
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    {uploadedFile ? uploadedFile.name : 'Choose File'}
                  </label>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!uploadedFile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  Next: Review & Submit
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Step 3: Review & Submit</h4>
                <p className="text-gray-600">Review your upload details and submit</p>
              </div>

              {/* Review Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h5 className="font-medium text-gray-900 mb-4">Upload Summary</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product</label>
                    <p className="text-gray-900">{selectedProduct}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Team</label>
                    <p className="text-gray-900">{teams.find(t => t.id === selectedTeam)?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">File</label>
                    <p className="text-gray-900">{uploadedFile?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expected Columns</label>
                    <p className="text-gray-900">{columnConfigs.length} columns</p>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {isLoading && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-blue-900 font-medium">Uploading cases...</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">{uploadProgress}% complete</p>
                </div>
              )}

              {/* Upload Results */}
              {uploadResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Upload Complete
                  </h5>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{uploadResult.totalUploaded}</div>
                      <div className="text-sm text-green-700">Total Uploaded</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{uploadResult.autoAssigned}</div>
                      <div className="text-sm text-blue-700">Auto-Assigned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{uploadResult.unassigned}</div>
                      <div className="text-sm text-orange-700">Unassigned</div>
                    </div>
                  </div>

                  {uploadResult.errors.length > 0 && (
                    <div className="mt-4">
                      <h6 className="font-medium text-red-900 mb-2 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Errors ({uploadResult.errors.length})
                      </h6>
                      <div className="max-h-32 overflow-y-auto">
                        {uploadResult.errors.slice(0, 5).map((error: any, index: number) => (
                          <div key={index} className="text-sm text-red-700 mb-1">
                            Row {error.row}: {error.error}
                          </div>
                        ))}
                        {uploadResult.errors.length > 5 && (
                          <div className="text-sm text-red-600">
                            ...and {uploadResult.errors.length - 5} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={isLoading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleUploadCases}
                  disabled={isLoading || !!uploadResult}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadResult ? 'Upload Complete' : isLoading ? 'Uploading...' : 'Upload Cases'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};