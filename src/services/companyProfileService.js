import api from '../api/axios';

// The one endpoint on the whole app that's reachable with no token — the login page needs it
// before there's anything to authenticate with. Backend (PublicController) hand-picks exactly
// which settings keys this exposes; see PublicCompanyProfileDTO for the allowlist.
export const companyProfileService = {
  getPublic: () => api.get('/public/company-profile', { skipErrorToast: true }).then((res) => res.data),
};

export default companyProfileService;
