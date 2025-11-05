import { RESERVED_SUBDOMAINS, SUBDOMAIN_REGEX } from '../config/domain';

export interface SubdomainValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateSubdomainFormat = (subdomain: string): SubdomainValidationResult => {
  if (!subdomain || subdomain.trim() === '') {
    return {
      isValid: false,
      error: 'Subdomain is required'
    };
  }

  const normalizedSubdomain = subdomain.toLowerCase().trim();

  if (normalizedSubdomain.length < 3) {
    return {
      isValid: false,
      error: 'Subdomain must be at least 3 characters long'
    };
  }

  if (normalizedSubdomain.length > 63) {
    return {
      isValid: false,
      error: 'Subdomain must not exceed 63 characters'
    };
  }

  if (!SUBDOMAIN_REGEX.test(normalizedSubdomain)) {
    return {
      isValid: false,
      error: 'Subdomain can only contain lowercase letters, numbers, and hyphens (not at start/end)'
    };
  }

  if (RESERVED_SUBDOMAINS.includes(normalizedSubdomain)) {
    return {
      isValid: false,
      error: 'This subdomain is reserved and cannot be used'
    };
  }

  return {
    isValid: true
  };
};

export const sanitizeSubdomain = (subdomain: string): string => {
  return subdomain
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
    .substring(0, 63);
};

export const generateSubdomainSuggestions = (baseName: string, existingSubdomains: string[]): string[] => {
  const sanitized = sanitizeSubdomain(baseName);
  const suggestions: string[] = [];

  if (sanitized.length >= 3) {
    for (let i = 1; i <= 5; i++) {
      const suggestion = `${sanitized}${i}`;
      if (!existingSubdomains.includes(suggestion) && !RESERVED_SUBDOMAINS.includes(suggestion)) {
        suggestions.push(suggestion);
      }
    }

    const withHyphen = `${sanitized}-inc`;
    if (withHyphen.length <= 63 && !existingSubdomains.includes(withHyphen)) {
      suggestions.push(withHyphen);
    }

    const withCo = `${sanitized}-co`;
    if (withCo.length <= 63 && !existingSubdomains.includes(withCo)) {
      suggestions.push(withCo);
    }
  }

  return suggestions.slice(0, 5);
};
