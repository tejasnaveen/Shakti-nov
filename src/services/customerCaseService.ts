import { supabase } from '../lib/supabase';
import type { 
  TeamInchargeCase, 
  CaseUploadResult, 
  CaseFilters, 
  CaseAssignment 
} from '../types/caseManagement';

export interface CustomerCase {
  id?: string;
  tenant_id: string;
  assigned_employee_id?: string;
  team_id?: string;
  telecaller_id?: string;
  loan_id?: string;
  customer_name?: string;
  mobile_no?: string;
  alternate_number?: string;
  email?: string;
  loan_amount?: string;
  loan_type?: string;
  outstanding_amount?: string;
  pos_amount?: string;
  emi_amount?: string;
  pending_dues?: string;
  dpd?: number;
  branch_name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  sanction_date?: string;
  last_paid_date?: string;
  last_paid_amount?: string;
  payment_link?: string;
  remarks?: string;
  case_data?: Record<string, any>;
  product_name?: string;
  case_status?: string;
  status?: 'new' | 'assigned' | 'in_progress' | 'closed';
  priority?: string;
  uploaded_by?: string;
  assigned_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CallLog {
  id?: string;
  case_id: string;
  employee_id: string;
  call_status: string;
  ptp_date?: string;
  call_notes?: string;
  call_duration?: number;
  call_result?: string;
  amount_collected?: string;
  created_at?: string;
}

export const customerCaseService = {
  async getCasesByEmployee(tenantId: string, employeeId: string): Promise<CustomerCase[]> {
    const { data, error } = await supabase
      .from('customer_cases')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('assigned_employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer cases:', error);
      throw new Error('Failed to fetch customer cases');
    }

    return data || [];
  },

  async getCasesByTelecaller(tenantId: string, empId: string): Promise<CustomerCase[]> {
    try {
      // First, find the employee by EMPID
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('emp_id', empId)
        .eq('role', 'Telecaller')
        .eq('status', 'active')
        .single();

      if (employeeError) {
        console.error('Error finding telecaller employee:', employeeError);
        // Return empty array instead of throwing error
        return [];
      }

      if (!employee) {
        console.warn('No active telecaller found with EMPID:', empId);
        return [];
      }

      // Then fetch cases assigned to this telecaller
      const { data, error } = await supabase
        .from('customer_cases')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('telecaller_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer cases for telecaller:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error in getCasesByTelecaller:', error);
      return [];
    }
  },

  async getAllCases(tenantId: string): Promise<CustomerCase[]> {
    const { data, error } = await supabase
      .from('customer_cases')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all cases:', error);
      throw new Error('Failed to fetch all cases');
    }

    return data || [];
  },

  async createCase(caseData: Omit<CustomerCase, 'id' | 'created_at' | 'updated_at'>): Promise<CustomerCase> {
    const { data, error } = await supabase
      .from('customer_cases')
      .insert([caseData])
      .select()
      .single();

    if (error) {
      console.error('Error creating case:', error);
      throw new Error('Failed to create case');
    }

    return data;
  },

  async bulkCreateCases(cases: Omit<CustomerCase, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    const { error } = await supabase
      .from('customer_cases')
      .insert(cases);

    if (error) {
      console.error('Error bulk creating cases:', error);
      throw new Error('Failed to bulk create cases');
    }
  },

  async updateCase(caseId: string, updates: Partial<CustomerCase>): Promise<CustomerCase> {
    const { data, error } = await supabase
      .from('customer_cases')
      .update(updates)
      .eq('id', caseId)
      .select()
      .single();

    if (error) {
      console.error('Error updating case:', error);
      throw new Error('Failed to update case');
    }

    return data;
  },

  async deleteCase(caseId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_cases')
      .delete()
      .eq('id', caseId);

    if (error) {
      console.error('Error deleting case:', error);
      throw new Error('Failed to delete case');
    }
  },

  async addCallLog(callLog: Omit<CallLog, 'id' | 'created_at'>): Promise<CallLog> {
    const { data, error } = await supabase
      .from('case_call_logs')
      .insert([callLog])
      .select()
      .single();

    if (error) {
      console.error('Error adding call log:', error);
      throw new Error('Failed to add call log');
    }

    return data;
  },

  async getCallLogsByCase(caseId: string): Promise<CallLog[]> {
    const { data, error } = await supabase
      .from('case_call_logs')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching call logs:', error);
      throw new Error('Failed to fetch call logs');
    }

    return data || [];
  },

  async getCaseStatsByEmployee(tenantId: string, employeeId: string): Promise<any> {
    const cases = await this.getCasesByEmployee(tenantId, employeeId);

    return {
      totalCases: cases.length,
      pendingCases: cases.filter(c => c.case_status === 'pending').length,
      inProgressCases: cases.filter(c => c.case_status === 'in_progress').length,
      resolvedCases: cases.filter(c => c.case_status === 'resolved').length,
      highPriorityCases: cases.filter(c => c.priority === 'high' || c.priority === 'urgent').length
    };
  },

  // Team Incharge specific methods
  async getTeamCases(tenantId: string, teamId: string): Promise<TeamInchargeCase[]> {
    const { data, error } = await supabase
      .from('customer_cases')
      .select(`
        *,
        telecaller:employees!telecaller_id(
          id,
          name,
          emp_id
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching team cases:', error);
      throw new Error('Failed to fetch team cases');
    }

    return data || [];
  },

  async getUnassignedTeamCases(tenantId: string, teamId: string): Promise<TeamInchargeCase[]> {
    const { data, error } = await supabase
      .from('customer_cases')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('team_id', teamId)
      .is('telecaller_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unassigned cases:', error);
      throw new Error('Failed to fetch unassigned cases');
    }

    return data || [];
  },

  async getCasesByFilters(tenantId: string, teamId: string, filters: CaseFilters): Promise<TeamInchargeCase[]> {
    console.log('Getting cases with filters:', filters);
    
    let query = supabase
      .from('customer_cases')
      .select(`
        *,
        telecaller:employees!telecaller_id(
          id,
          name,
          emp_id
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('team_id', teamId);

    if (filters.product && filters.product.trim() !== '') {
      query = query.eq('product_name', filters.product);
    }

    if (filters.telecaller && filters.telecaller.trim() !== '') {
      query = query.eq('telecaller_id', filters.telecaller);
    }

    if (filters.status && filters.status.trim() !== '') {
      query = query.eq('status', filters.status);
    }

    if (filters.dateFrom && filters.dateFrom.trim() !== '') {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo && filters.dateTo.trim() !== '') {
      query = query.lte('created_at', filters.dateTo + 'T23:59:59.999Z');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching filtered cases:', error);
      throw new Error('Failed to fetch filtered cases');
    }

    console.log(`Found ${data?.length || 0} cases with filters`);
    return data || [];
  },

  async createBulkCases(cases: Omit<CustomerCase, 'id' | 'created_at' | 'updated_at'>[]): Promise<CaseUploadResult> {
    let totalUploaded = 0;
    let autoAssigned = 0;
    let unassigned = 0;
    const errors: Array<{ row: number; error: string; data: any }> = [];

    // Get all telecallers for auto-assignment lookup
    const telecallerMap = new Map<string, string>();
    const { data: telecallers } = await supabase
      .from('employees')
      .select('id, emp_id')
      .eq('tenant_id', cases[0]?.tenant_id)
      .eq('role', 'Telecaller')
      .eq('status', 'active');

    telecallers?.forEach(tel => {
      telecallerMap.set(tel.emp_id, tel.id);
    });

    // Process cases in batches
    for (let i = 0; i < cases.length; i++) {
      try {
        const caseData = cases[i];
        const rowNumber = i + 1;

        // Auto-assign based on EMPID if available
        if (caseData.case_data?.EMPID && telecallerMap.has(caseData.case_data.EMPID)) {
          caseData.telecaller_id = telecallerMap.get(caseData.case_data.EMPID);
          caseData.status = 'assigned';
          autoAssigned++;
        } else {
          caseData.status = 'new';
          unassigned++;
        }

        // Insert the case
        const { error } = await supabase
          .from('customer_cases')
          .insert([caseData]);

        if (error) {
          errors.push({
            row: rowNumber,
            error: error.message,
            data: caseData
          });
        } else {
          totalUploaded++;
        }
      } catch (error: any) {
        errors.push({
          row: i + 1,
          error: error.message,
          data: cases[i]
        });
      }
    }

    return {
      totalUploaded,
      autoAssigned,
      unassigned,
      errors
    };
  },

  async assignCase(caseId: string, assignment: CaseAssignment): Promise<void> {
    const updateData: any = {
      telecaller_id: assignment.telecallerId,
      updated_at: new Date().toISOString()
    };

    // Set status based on assignment type
    if (assignment.telecallerId) {
      // Assigning - set status to 'assigned'
      updateData.status = 'assigned';
    } else {
      // Unassigning - set status to 'new'
      updateData.status = 'new';
    }

    const { error } = await supabase
      .from('customer_cases')
      .update(updateData)
      .eq('id', caseId);

    if (error) {
      console.error('Error assigning/unassigning case:', error);
      throw new Error('Failed to update case assignment');
    }
  },

  async getTelecallerCaseStats(tenantId: string, telecallerId: string): Promise<{
    total: number;
    new: number;
    assigned: number;
    inProgress: number;
    closed: number;
  }> {
    const { data, error } = await supabase
      .from('customer_cases')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('telecaller_id', telecallerId);

    if (error) {
      console.error('Error fetching telecaller case stats:', error);
      throw new Error('Failed to fetch telecaller case stats');
    }

    const cases = data || [];
    return {
      total: cases.length,
      new: cases.filter(c => c.status === 'new').length,
      assigned: cases.filter(c => c.status === 'assigned').length,
      inProgress: cases.filter(c => c.status === 'in_progress').length,
      closed: cases.filter(c => c.status === 'closed').length
    };
  }
};
