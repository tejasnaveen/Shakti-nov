export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  domain?: string;
  status: 'active' | 'inactive' | 'suspended';

  // Company details
  proprietorName?: string;
  phoneNumber?: string;
  address?: string;
  gstNumber?: string;

  // Legacy fields (keeping for backward compatibility)
  plan?: 'basic' | 'standard' | 'premium' | 'enterprise';
  maxUsers?: number;
  maxConnections?: number;

  settings: {
    branding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
    features?: {
      voip?: boolean;
      sms?: boolean;
      analytics?: boolean;
      apiAccess?: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // SuperAdmin ID
}

export interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  setTenant: (tenant: Tenant) => void;
  clearTenant: () => void;
}

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  adminEmail: string;
  adminName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  panNumber?: string;
  status: 'active' | 'inactive';
  subscription: {
    plan: 'basic' | 'standard' | 'premium' | 'enterprise';
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  };
  settings: {
    timezone: string;
    currency: string;
    language: string;
  };
  limits: {
    maxUsers: number;
    maxConnections: number;
    maxStorage: number; // in MB
  };
  usage: {
    currentUsers: number;
    currentConnections: number;
    storageUsed: number; // in MB
  };
  createdAt: Date;
  updatedAt: Date;
}