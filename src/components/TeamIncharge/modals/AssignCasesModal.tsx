import React, { useState, useEffect } from 'react';
import { UserCheck, X, Search, Users, CheckCircle, Eye, Trash2, RotateCcw, AlertTriangle, Maximize, Minimize, UserX } from 'lucide-react';
import { customerCaseService } from '../../../services/customerCaseService';
import { TeamService } from '../../../services/teamService';
import { useNotification, notificationHelpers } from '../../shared/Notification';
import { useAuth } from '../../../contexts/AuthContext';
import { useTenant } from '../../../contexts/TenantContext';
import type { TeamInchargeCase } from '../../../types/caseManagement';

interface AssignCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExpandedCase {
  [key: string]: boolean;
}

export const AssignCasesModal: React.FC<AssignCasesModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { showNotification } = useNotification();

  const [isLoading, setIsLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [allCases, setAllCases] = useState<TeamInchargeCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<TeamInchargeCase[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [telecallers, setTelecallers] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedTelecaller, setSelectedTelecaller] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [assignmentProgress, setAssignmentProgress] = useState(0);
  const [assignmentResult, setAssignmentResult] = useState<any>(null);
  const [expandedCases, setExpandedCases] = useState<ExpandedCase>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{caseId: string, caseDetails: any} | null>(null);
  const [actionType, setActionType] = useState<'assign' | 'unassign'>('assign');

  useEffect(() => {
    if (isOpen && tenant?.id && user?.id) {
      loadInitialData();
    }
  }, [isOpen, tenant?.id, user?.id]);

  useEffect(() => {
    applyFilters();
  }, [allCases, searchTerm]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // Load teams for this team incharge
      const teamData = await TeamService.getTeams(tenant!.id);
      const userTeams = teamData.filter((team: any) => 
        team.team_incharge_id === user?.id && team.status === 'active'
      );
      setTeams(userTeams);

      if (userTeams.length > 0) {
        const firstTeam = userTeams[0];
        setSelectedTeam(firstTeam.id);
        setTelecallers(firstTeam.telecallers || []);
        await loadTeamCases(firstTeam.id);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      showNotification(notificationHelpers.error(
        'Error',
        'Failed to load initial data'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamCases = async (teamId: string) => {
    try {
      setIsLoading(true);
      // Load both assigned and unassigned cases for the team
      const cases = await customerCaseService.getTeamCases(tenant!.id, teamId);
      setAllCases(cases);
    } catch (error) {
      console.error('Error loading team cases:', error);
      showNotification(notificationHelpers.error(
        'Error',
        'Failed to load team cases'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allCases];

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(case_ => 
        case_.case_data?.customerName?.toLowerCase().includes(searchLower) ||
        case_.case_data?.loanId?.toLowerCase().includes(searchLower) ||
        case_.case_data?.mobileNo?.includes(searchTerm)
      );
    }

    setFilteredCases(filtered);
    setSelectedCases(new Set()); // Clear selections when filters change
  };

  const handleTeamChange = async (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedTelecaller('');
    setSearchTerm('');
    setActionType('assign');
    
    // Update telecallers for selected team
    const selectedTeamData = teams.find(t => t.id === teamId);
    setTelecallers(selectedTeamData?.telecallers || []);
    
    // Load team cases (both assigned and unassigned)
    await loadTeamCases(teamId);
  };

  const handleCaseSelect = (caseId: string) => {
    const newSelected = new Set(selectedCases);
    if (newSelected.has(caseId)) {
      newSelected.delete(caseId);
    } else {
      newSelected.add(caseId);
    }
    setSelectedCases(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCases.size === filteredCases.length) {
      setSelectedCases(new Set());
    } else {
      setSelectedCases(new Set(filteredCases.map(c => c.id!)));
    }
  };

  const handleBulkAssignment = async () => {
    if (actionType === 'assign' && (!selectedTelecaller || selectedCases.size === 0)) {
      showNotification(notificationHelpers.error(
        'Missing Data',
        'Please select a telecaller and at least one case'
      ));
      return;
    }

    if (actionType === 'unassign' && selectedCases.size === 0) {
      showNotification(notificationHelpers.error(
        'Missing Data',
        'Please select at least one case to unassign'
      ));
      return;
    }

    try {
      setIsLoading(true);
      setAssignmentProgress(0);
      setAssignmentResult(null);

      const selectedCaseIds = Array.from(selectedCases);
      let successCount = 0;
      let errorCount = 0;
      const errors: any[] = [];

      for (let i = 0; i < selectedCaseIds.length; i++) {
        const caseId = selectedCaseIds[i];
        try {
          if (actionType === 'assign') {
            await customerCaseService.assignCase(caseId, {
              caseId,
              telecallerId: selectedTelecaller,
              assignedBy: user!.id
            });
          } else {
            // Unassign - set telecaller_id to null and status to 'new'
            await customerCaseService.assignCase(caseId, {
              caseId,
              telecallerId: null,
              assignedBy: user!.id
            });
          }
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push({
            caseId: caseId.substring(0, 8),
            error: error.message
          });
        }
        
        setAssignmentProgress(((i + 1) / selectedCaseIds.length) * 100);
      }

      setAssignmentResult({
        total: selectedCaseIds.length,
        success: successCount,
        errors: errorCount,
        errorDetails: errors,
        action: actionType
      });

      if (successCount > 0) {
        showNotification(notificationHelpers.success(
          'Operation Complete',
          `Successfully ${actionType === 'assign' ? 'assigned' : 'unassigned'} ${successCount} cases`
        ));
        await loadTeamCases(selectedTeam);
        onSuccess();
      }

      if (errorCount > 0) {
        showNotification(notificationHelpers.warning(
          'Operation Completed with Errors',
          `${errorCount} cases failed to ${actionType}`
        ));
      }
    } catch (error: any) {
      console.error('Bulk operation error:', error);
      showNotification(notificationHelpers.error(
        'Operation Failed',
        error.message || `Failed to ${actionType} cases`
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCase = (caseId: string) => {
    setExpandedCases(prev => ({
      ...prev,
      [caseId]: !prev[caseId]
    }));
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      setIsLoading(true);
      await customerCaseService.deleteCase(caseId);
      showNotification(notificationHelpers.success(
        'Case Deleted',
        'Case has been successfully deleted'
      ));
      await loadTeamCases(selectedTeam);
      onSuccess();
    } catch (error: any) {
      console.error('Delete case error:', error);
      showNotification(notificationHelpers.error(
        'Delete Failed',
        error.message || 'Failed to delete case'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassignCase = async (caseId: string, newTelecallerId: string) => {
    try {
      setIsLoading(true);
      await customerCaseService.assignCase(caseId, {
        caseId,
        telecallerId: newTelecallerId,
        assignedBy: user!.id
      });
      showNotification(notificationHelpers.success(
        'Case Reassigned',
        'Case has been reassigned successfully'
      ));
      await loadTeamCases(selectedTeam);
      onSuccess();
    } catch (error: any) {
      console.error('Reassignment error:', error);
      showNotification(notificationHelpers.error(
        'Reassignment Failed',
        error.message || 'Failed to reassign case'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const resetModal = () => {
    setAllCases([]);
    setFilteredCases([]);
    setTeams([]);
    setTelecallers([]);
    setSelectedTeam('');
    setSelectedTelecaller('');
    setSearchTerm('');
    setSelectedCases(new Set());
    setAssignmentProgress(0);
    setAssignmentResult(null);
    setExpandedCases({});
    setShowDeleteConfirm(null);
    setActionType('assign');
    setIsMaximized(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getCaseStatusBadge = (case_: TeamInchargeCase) => {
    if (case_.telecaller_id) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <UserCheck className="w-3 h-3 mr-1" />
          Assigned
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Unassigned
        </span>
      );
    }
  };

  // Filter cases based on action type
  const getApplicableCases = () => {
    if (actionType === 'assign') {
      // For assign action, show only unassigned cases
      return filteredCases.filter(case_ => !case_.telecaller_id);
    } else {
      // For unassign action, show only assigned cases
      return filteredCases.filter(case_ => case_.telecaller_id);
    }
  };

  const applicableCases = getApplicableCases();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-xl shadow-2xl w-full transition-all duration-300 transform ${
        isMaximized 
          ? 'h-screen rounded-none' 
          : 'max-w-7xl mx-4 max-h-[95vh]'
      } overflow-hidden border border-gray-100`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-green-600" />
            Manage Cases
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMaximize}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isMaximized ? 'Minimize' : 'Maximize'}
            >
              {isMaximized ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* Team Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="">Select Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            {/* Action Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select
                value={actionType}
                onChange={(e) => {
                  setActionType(e.target.value as 'assign' | 'unassign');
                  setSelectedTelecaller('');
                  setSelectedCases(new Set());
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="assign">Assign Cases</option>
                <option value="unassign">Unassign Cases</option>
              </select>
            </div>

            {/* Telecaller Selection (for assign only) */}
            {actionType === 'assign' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Telecaller</label>
                <select
                  value={selectedTelecaller}
                  onChange={(e) => setSelectedTelecaller(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading || !selectedTeam}
                >
                  <option value="">Select Telecaller</option>
                  {telecallers.map((telecaller) => (
                    <option key={telecaller.id} value={telecaller.id}>
                      {telecaller.name} ({telecaller.emp_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Cases</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by customer name, loan ID, or mobile"
                  className="pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Case Count Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Cases</label>
              <div className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
                {actionType === 'assign' ? (
                  <span className="text-orange-600 font-medium">
                    {applicableCases.length} Unassigned
                  </span>
                ) : (
                  <span className="text-blue-600 font-medium">
                    {applicableCases.length} Assigned
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Assignment Progress */}
          {isLoading && assignmentProgress > 0 && (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                <span className="text-green-900 font-medium">
                  {actionType === 'assign' ? 'Assigning...' : 'Unassigning...'}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${assignmentProgress}%` }}
                ></div>
              </div>
              <p className="text-green-700 text-sm mt-1">{Math.round(assignmentProgress)}% complete</p>
            </div>
          )}

          {/* Assignment Results */}
          {assignmentResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h5 className="font-medium text-green-900 mb-2 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Operation Complete
              </h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{assignmentResult.success}</div>
                  <div className="text-sm text-green-700">
                    Successfully {assignmentResult.action === 'assign' ? 'Assigned' : 'Unassigned'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{assignmentResult.errors}</div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {applicableCases.length} {actionType === 'assign' ? 'unassigned' : 'assigned'} cases
              {selectedCases.size > 0 && ` • ${selectedCases.size} selected`}
            </div>
            <button
              onClick={handleBulkAssignment}
              disabled={
                (actionType === 'assign' && (!selectedTelecaller || selectedCases.size === 0)) ||
                (actionType === 'unassign' && selectedCases.size === 0) ||
                isLoading
              }
              className={`px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center ${
                actionType === 'assign' ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              {actionType === 'assign' ? (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Assign {selectedCases.size} Cases
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4 mr-2" />
                  Unassign {selectedCases.size} Cases
                </>
              )}
            </button>
          </div>
        </div>

        {/* Cases Table */}
        <div className={`flex-1 overflow-hidden ${isMaximized ? 'h-[calc(100vh-320px)]' : ''}`}>
          {isLoading && allCases.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : applicableCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              {actionType === 'assign' ? (
                <UserCheck className="w-12 h-12 text-gray-300 mb-3" />
              ) : (
                <UserX className="w-12 h-12 text-gray-300 mb-3" />
              )}
              <p className="text-lg font-medium">
                No {actionType === 'assign' ? 'unassigned' : 'assigned'} cases found
              </p>
              <p className="text-sm">
                {allCases.length === 0 
                  ? 'No cases available for this team'
                  : actionType === 'assign' 
                    ? 'All cases are already assigned' 
                    : 'No cases are currently assigned'
                }
              </p>
            </div>
          ) : (
            <div className={`overflow-auto ${isMaximized ? 'h-full' : 'max-h-96'}`}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCases.size === applicableCases.length && applicableCases.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                        disabled={isLoading}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Case Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applicableCases.map((case_) => {
                    const details = case_.case_data || {};
                    const isSelected = selectedCases.has(case_.id!);
                    const isExpanded = expandedCases[case_.id!];
                    
                    return (
                      <React.Fragment key={case_.id}>
                        <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-green-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleCaseSelect(case_.id!)}
                              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                              disabled={isLoading}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {details.customerName || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {details.loanId} • {details.mobileNo}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getCaseStatusBadge(case_)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {case_.telecaller ? case_.telecaller.name : 'Unassigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {case_.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleViewCase(case_.id!)}
                              className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {case_.telecaller && (
                              <button
                                onClick={() => {
                                  const newTelecallerId = prompt('Enter new telecaller ID for reassignment:');
                                  if (newTelecallerId) {
                                    handleReassignCase(case_.id!, newTelecallerId);
                                  }
                                }}
                                className="text-orange-600 hover:text-orange-900 p-1 hover:bg-orange-50 rounded"
                                title="Reassign Case"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setShowDeleteConfirm({caseId: case_.id!, caseDetails: details})}
                              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                              title="Delete Case"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {/* Expanded Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="text-sm">
                                <h4 className="font-medium text-gray-900 mb-2">Case Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  {Object.entries(details).map(([key, value]) => (
                                    <div key={key}>
                                      <span className="font-medium text-gray-700">{key}:</span>
                                      <span className="ml-2 text-gray-600">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete case for <strong>{showDeleteConfirm.caseDetails.customerName}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteCase(showDeleteConfirm.caseId);
                    setShowDeleteConfirm(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};