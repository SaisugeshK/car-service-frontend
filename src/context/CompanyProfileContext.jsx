import { createContext, useContext, useEffect, useState } from 'react';
import companyProfileService from '../services/companyProfileService';

const CompanyProfileContext = createContext(null);

// Generic, non-branded fallback — shown only until a Super Admin sets the real name in
// Business Settings. Never hardcode a specific business's name here; that's exactly the
// anti-pattern this context exists to remove.
const DEFAULT_NAME = 'Service Center';

export function CompanyProfileProvider({ children }) {
  const [profile, setProfile] = useState({ companyName: null, tagline: null, logo: null, phone: null, whatsapp: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyProfileService
      .getPublic()
      .then(setProfile)
      .catch(() => {
        // Public, best-effort, and read by an unauthenticated screen — a failed fetch (offline,
        // backend momentarily down) must fall back quietly, never block the login page itself.
      })
      .finally(() => setLoading(false));
  }, []);

  // Single place that touches the actual <title> and favicon <link> — Login, Navbar, and Sidebar
  // all just render `companyName`/`logo` from context; they never reach into document.head.
  useEffect(() => {
    if (!profile.companyName) return;
    document.title = `${profile.companyName} | Service Center`;
  }, [profile.companyName]);

  useEffect(() => {
    if (!profile.logo) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = profile.logo;
  }, [profile.logo]);

  const value = {
    companyName: profile.companyName || DEFAULT_NAME,
    hasCustomName: Boolean(profile.companyName),
    tagline: profile.tagline || '',
    logo: profile.logo || '',
    phone: profile.phone || '',
    whatsapp: profile.whatsapp || '',
    loading,
  };

  return <CompanyProfileContext.Provider value={value}>{children}</CompanyProfileContext.Provider>;
}

export function useCompanyProfile() {
  const ctx = useContext(CompanyProfileContext);
  if (!ctx) throw new Error('useCompanyProfile must be used within a CompanyProfileProvider');
  return ctx;
}

export default CompanyProfileContext;
