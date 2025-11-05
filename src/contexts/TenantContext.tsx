import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, TenantContextType } from '../types/tenant';
import { getTenantBySubdomain, getTenantIdentifier, isMainDomain } from '../utils/tenantDetection';

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeTenant = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const hostname = window.location.hostname;
      console.log('[TenantContext] Current hostname:', hostname);
      console.log('[TenantContext] Full URL:', window.location.href);

      if (isMainDomain(hostname)) {
        console.log('[TenantContext] Main domain detected - superadmin access');
        setTenant(null);
        setIsLoading(false);
        return;
      }

      const tenantIdentifier = getTenantIdentifier(hostname);
      console.log('[TenantContext] Tenant identifier:', tenantIdentifier);

      if (!tenantIdentifier) {
        console.log('[TenantContext] No tenant identifier found');
        setError('No tenant subdomain detected in URL');
        setTenant(null);
        setIsLoading(false);
        return;
      }

      console.log('[TenantContext] Fetching tenant data for subdomain:', tenantIdentifier);
      const tenantData = await getTenantBySubdomain(tenantIdentifier);
      console.log('[TenantContext] Tenant data loaded:', tenantData);

      if (!tenantData) {
        const errorMsg = `Tenant not found for subdomain: ${tenantIdentifier}`;
        console.error('[TenantContext]', errorMsg);
        setError(errorMsg);
        setTenant(null);
        setIsLoading(false);
        return;
      }

      if (tenantData.status !== 'active') {
        const errorMsg = `Tenant "${tenantData.name}" is not active (status: ${tenantData.status})`;
        console.warn('[TenantContext]', errorMsg);
        setError(errorMsg);
        setTenant(null);
        setIsLoading(false);
        return;
      }

      console.log('[TenantContext] Tenant loaded successfully:', tenantData.name);
      setTenant(tenantData);
    } catch (err) {
      console.error('[TenantContext] Error initializing tenant:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tenant';
      setError(errorMessage);
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeTenant();
  }, []);

  const clearTenant = () => {
    setTenant(null);
    setError(null);
  };

  const refreshTenant = async () => {
    await initializeTenant();
  };

  const value: TenantContextType = {
    tenant,
    isLoading,
    error,
    setTenant,
    clearTenant,
    refreshTenant
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};