import { Tenant } from '../types/tenant';
import { supabase } from '../lib/supabase';

const parseWebContainerURL = (hostname: string): string => {
  const pattern = /^([a-z0-9]+)(?:-[a-z0-9]+)?--\d+--[a-z0-9]+\.local-credentialless\.webcontainer-api\.io$/i;
  const match = hostname.match(pattern);

  if (match && match[1]) {
    console.log('[Tenant Detection] WebContainer URL detected:', hostname);
    console.log('[Tenant Detection] Extracted subdomain:', match[1]);
    return match[1];
  }

  const fallbackPattern = /^([a-z0-9]+)/i;
  const fallbackMatch = hostname.match(fallbackPattern);

  if (fallbackMatch && fallbackMatch[1]) {
    console.log('[Tenant Detection] Using fallback extraction for:', hostname);
    console.log('[Tenant Detection] Extracted subdomain:', fallbackMatch[1]);
    return fallbackMatch[1];
  }

  console.log('[Tenant Detection] Failed to extract subdomain from WebContainer URL:', hostname);
  return '';
};

export const extractSubdomain = (hostname: string): string => {
  const hostnameWithoutPort = hostname.split(':')[0];
  console.log('[Tenant Detection] Processing hostname:', hostnameWithoutPort);
  console.log('[Tenant Detection] Full hostname:', hostname);

  // Handle localhost subdomains like yanaviaa.localhost or yanavi.localhost
  if (hostnameWithoutPort.includes('localhost')) {
    const parts = hostnameWithoutPort.split('.');
    console.log('[Tenant Detection] Localhost parts:', parts);

    // Handle subdomain.localhost format (e.g., yanaviaa.localhost)
    if (parts.length === 2 && parts[1] === 'localhost' && parts[0] !== 'localhost') {
      console.log('[Tenant Detection] Localhost subdomain detected:', parts[0]);
      return parts[0];
    }

    // Handle localhost with port (e.g., localhost:3000)
    if (parts.length === 1 && parts[0] === 'localhost') {
      console.log('[Tenant Detection] Main localhost domain, no subdomain');
      return '';
    }

    // Handle cases where port is included in the split (e.g., yanaviaa.localhost:3000)
    if (parts.length === 3 && parts[1] === 'localhost' && parts[0] !== 'localhost') {
      console.log('[Tenant Detection] Localhost subdomain with port detected:', parts[0]);
      return parts[0];
    }

    console.log('[Tenant Detection] No valid localhost subdomain pattern found');
    return '';
  }

  if (hostnameWithoutPort.includes('.local-credentialless.webcontainer-api.io')) {
    return parseWebContainerURL(hostnameWithoutPort);
  }

  if (hostnameWithoutPort.includes('webcontainer')) {
    console.log('[Tenant Detection] Generic webcontainer URL, no subdomain');
    return '';
  }

  const parts = hostnameWithoutPort.split('.');
  if (parts.length > 2) {
    console.log('[Tenant Detection] Standard subdomain detected:', parts[0]);
    return parts[0];
  }

  console.log('[Tenant Detection] No subdomain detected');
  return '';
};

export const extractDomain = (hostname: string): string => {
  const hostnameWithoutPort = hostname.split(':')[0];
  const parts = hostnameWithoutPort.split('.');

  if (hostnameWithoutPort === 'localhost' || hostnameWithoutPort.includes('127.0.0.1')) {
    return hostnameWithoutPort;
  }

  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }

  return hostnameWithoutPort;
};

export const isMainDomain = (hostname: string): boolean => {
  const subdomain = extractSubdomain(hostname);
  return !subdomain || subdomain === 'www';
};

export const getTenantIdentifier = (hostname: string): string | null => {
  if (isMainDomain(hostname)) {
    return null;
  }
  return extractSubdomain(hostname);
};

export const getTenantBySubdomain = async (subdomain: string): Promise<Tenant | null> => {
  const normalizedSubdomain = subdomain.toLowerCase().trim();

  // First try to match the exact subdomain/URL as stored in database
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', normalizedSubdomain)
    .maybeSingle();

  if (error) {
    console.error('Error fetching tenant by subdomain:', error);
    return null;
  }

  if (data) {
    return {
      id: data.id,
      name: data.name,
      subdomain: data.subdomain,
      status: data.status,
      proprietorName: data.proprietor_name,
      phoneNumber: data.phone_number,
      address: data.address,
      gstNumber: data.gst_number,
      plan: data.plan,
      maxUsers: data.max_users,
      maxConnections: data.max_connections,
      settings: data.settings || { branding: {}, features: {} },
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by
    };
  }

  // If no exact match, try to extract subdomain from URL and search
  const extractedSubdomain = extractSubdomain(normalizedSubdomain);
  if (extractedSubdomain && extractedSubdomain !== normalizedSubdomain) {
    console.log('[Tenant Detection] Trying subdomain extraction:', extractedSubdomain);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', extractedSubdomain)
      .maybeSingle();

    if (fallbackError) {
      console.error('Error in fallback tenant search:', fallbackError);
      return null;
    }

    if (fallbackData) {
      return {
        id: fallbackData.id,
        name: fallbackData.name,
        subdomain: fallbackData.subdomain,
        status: fallbackData.status,
        proprietorName: fallbackData.proprietor_name,
        phoneNumber: fallbackData.phone_number,
        address: fallbackData.address,
        gstNumber: fallbackData.gst_number,
        plan: fallbackData.plan,
        maxUsers: fallbackData.max_users,
        maxConnections: fallbackData.max_connections,
        settings: fallbackData.settings || { branding: {}, features: {} },
        createdAt: new Date(fallbackData.created_at),
        updatedAt: new Date(fallbackData.updated_at),
        createdBy: fallbackData.created_by
      };
    }
  }

  return null;
};

export const getAllTenants = async (): Promise<Tenant[]> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all tenants:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    subdomain: item.subdomain,
    status: item.status,
    proprietorName: item.proprietor_name,
    phoneNumber: item.phone_number,
    address: item.address,
    gstNumber: item.gst_number,
    plan: item.plan,
    maxUsers: item.max_users,
    maxConnections: item.max_connections,
    settings: item.settings || { branding: {}, features: {} },
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
    createdBy: item.created_by
  }));
};

export const createTenant = async (tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> => {
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      name: tenantData.name,
      subdomain: tenantData.subdomain.toLowerCase(),
      status: tenantData.status,
      proprietor_name: tenantData.proprietorName,
      phone_number: tenantData.phoneNumber,
      address: tenantData.address,
      gst_number: tenantData.gstNumber,
      plan: tenantData.plan || 'basic',
      max_users: tenantData.maxUsers || 10,
      max_connections: tenantData.maxConnections || 5,
      settings: tenantData.settings,
      created_by: tenantData.createdBy
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating tenant:', error);
    if (error.code === '23505') {
      throw new Error('A tenant with this subdomain already exists');
    }
    if (error.code === '23503') {
      throw new Error('Invalid super admin reference. Please log in again.');
    }
    if (error.code === '42501') {
      throw new Error('Permission denied. Please ensure you are logged in as a super admin.');
    }
    throw new Error(error.message || 'Failed to create tenant');
  }

  return {
    id: data.id,
    name: data.name,
    subdomain: data.subdomain,
    status: data.status,
    proprietorName: data.proprietor_name,
    phoneNumber: data.phone_number,
    address: data.address,
    gstNumber: data.gst_number,
    plan: data.plan,
    maxUsers: data.max_users,
    maxConnections: data.max_connections,
    settings: data.settings,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    createdBy: data.created_by
  };
};

export const updateTenant = async (tenantId: string, updates: Partial<Tenant>): Promise<Tenant> => {
  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.subdomain !== undefined) updateData.subdomain = updates.subdomain.toLowerCase();
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.proprietorName !== undefined) updateData.proprietor_name = updates.proprietorName;
  if (updates.phoneNumber !== undefined) updateData.phone_number = updates.phoneNumber;
  if (updates.address !== undefined) updateData.address = updates.address;
  if (updates.gstNumber !== undefined) updateData.gst_number = updates.gstNumber;
  if (updates.plan !== undefined) updateData.plan = updates.plan;
  if (updates.maxUsers !== undefined) updateData.max_users = updates.maxUsers;
  if (updates.maxConnections !== undefined) updateData.max_connections = updates.maxConnections;
  if (updates.settings !== undefined) updateData.settings = updates.settings;

  const { data, error } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating tenant:', error);
    throw new Error('Failed to update tenant');
  }

  return {
    id: data.id,
    name: data.name,
    subdomain: data.subdomain,
    status: data.status,
    proprietorName: data.proprietor_name,
    phoneNumber: data.phone_number,
    address: data.address,
    gstNumber: data.gst_number,
    plan: data.plan,
    maxUsers: data.max_users,
    maxConnections: data.max_connections,
    settings: data.settings,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    createdBy: data.created_by
  };
};

export const deleteTenant = async (tenantId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId);

  if (error) {
    console.error('Error deleting tenant:', error);
    throw new Error('Failed to delete tenant');
  }

  return true;
};