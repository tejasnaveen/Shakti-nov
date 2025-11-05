import { supabase } from '../lib/supabase';
import { validateSubdomainFormat, sanitizeSubdomain, generateSubdomainSuggestions } from '../utils/subdomainValidation';

export interface SubdomainCheckResult {
  available: boolean;
  valid: boolean;
  error?: string;
  suggestions?: string[];
}

export const checkSubdomainAvailability = async (subdomain: string): Promise<SubdomainCheckResult> => {
  const normalizedSubdomain = sanitizeSubdomain(subdomain);

  const formatValidation = validateSubdomainFormat(normalizedSubdomain);

  if (!formatValidation.isValid) {
    return {
      available: false,
      valid: false,
      error: formatValidation.error
    };
  }

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('subdomain')
      .ilike('subdomain', normalizedSubdomain)
      .maybeSingle();

    if (error) {
      console.error('Error checking subdomain availability:', error);
      return {
        available: false,
        valid: true,
        error: 'Unable to verify subdomain availability. Please try again.'
      };
    }

    if (data) {
      const { data: allSubdomains } = await supabase
        .from('tenants')
        .select('subdomain');

      const existing = allSubdomains?.map(t => t.subdomain.toLowerCase()) || [];
      const suggestions = generateSubdomainSuggestions(normalizedSubdomain, existing);

      return {
        available: false,
        valid: true,
        error: 'This subdomain is already taken',
        suggestions
      };
    }

    return {
      available: true,
      valid: true
    };
  } catch (error) {
    console.error('Error in subdomain availability check:', error);
    return {
      available: false,
      valid: true,
      error: 'An error occurred while checking availability'
    };
  }
};

export const getAllSubdomains = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('subdomain');

    if (error) {
      console.error('Error fetching subdomains:', error);
      return [];
    }

    return data?.map(t => t.subdomain.toLowerCase()) || [];
  } catch (error) {
    console.error('Error in getAllSubdomains:', error);
    return [];
  }
};

export const validateSubdomainUniqueness = async (subdomain: string, excludeTenantId?: string): Promise<boolean> => {
  try {
    let query = supabase
      .from('tenants')
      .select('id, subdomain')
      .ilike('subdomain', subdomain);

    if (excludeTenantId) {
      query = query.neq('id', excludeTenantId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error validating subdomain uniqueness:', error);
      return false;
    }

    return !data;
  } catch (error) {
    console.error('Error in validateSubdomainUniqueness:', error);
    return false;
  }
};
