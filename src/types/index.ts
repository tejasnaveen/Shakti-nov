export interface Team {
  id: string;
  name: string;
  team_incharge?: TeamIncharge;
  team_incharge_id?: string;
  product_name?: string;
  telecallers?: Telecaller[];
  total_cases?: number;
  status?: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Telecaller {
  id: string;
  name: string;
  emp_id: string;
  email: string;
  phone?: string;
  team_id?: string;
  assigned_cases: number;
  status?: 'active' | 'inactive';
}

export interface TeamIncharge {
  id: string;
  name: string;
  emp_id: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

export interface TeamWithDetails {
  id: string;
  tenant_id: string;
  name: string;
  team_incharge?: {
    id: string;
    name: string;
    emp_id: string;
  };
  team_incharge_id: string;
  product_name: string;
  telecallers: {
    id: string;
    name: string;
    emp_id: string;
  }[];
  total_cases: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CustomerCase {
  id: string;
  tenant_id: string;
  assigned_employee_id: string;
  loan_id: string;
  customer_name: string;
  mobile_no: string;
  loan_amount: string;
  loan_type: string;
  outstanding_amount: string;
  pos_amount: string;
  emi_amount: string;
  pending_dues: string;
  dpd: number;
  branch_name: string;
  address: string;
  sanction_date?: string;
  last_paid_date?: string;
  last_paid_amount: string;
  payment_link: string;
  remarks: string;
  case_status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ColumnConfig {
  id: string;
  tenant_id: string;
  product_name: string;
  column_name: string;
  display_name: string;
  data_type: string;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  tenant_id: string;
  name: string;
  mobile: string;
  emp_id: string;
  password_hash: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'TeamIncharge' | 'Telecaller';
  status: 'active' | 'inactive';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface FileUploadState {
  file: File | null;
  isUploading: boolean;
  progress: number;
  status: string;
}

export interface ModalState<T = any> {
  isOpen: boolean;
  data?: T;
}

export interface TabConfig {
  id: string;
  label: string;
  icon?: any;
  badge?: string | number;
}

export interface TeamInchargeDashboardProps {
  user: any;
  onLogout: () => void;
}

export interface DashboardMetrics {
  totalTeams: number;
  totalTelecallers: number;
  totalCases: number;
  activeCases: number;
  resolvedCases: number;
  pendingCases: number;
}

export interface PerformanceData {
  name: string;
  calls: number;
  connected: number;
  success: number;
  rate: string;
}

export interface ReportFilters {
  fromTelecaller: string;
  toTelecaller: string;
  product: string;
  dpdRange: string;
  minAmount: string;
  maxAmount: string;
}

export interface ReassignPreview {
  totalCases: number;
  fromTelecaller: string;
  toTelecaller: string;
  product: string;
  dpdRange: string;
}