// Logs each role in once via the API and saves a browser session (localStorage tokens + user),
// so every test starts already signed in without clicking through the login page each time.
// The login page itself is covered by 01-auth.spec.js.
import fs from 'node:fs';
import path from 'node:path';
import { loginApi } from './api.js';
import { SUPER_ADMIN, EMPLOYEE, STATE } from './env.js';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5174';

async function writeState(creds, file) {
  const body = await loginApi(creds);
  const user = {
    userId: body.userId, username: body.username, email: body.email ?? creds.email,
    roleId: body.roleId, role: body.roleName ?? null,
  };
  const state = {
    cookies: [],
    origins: [{
      origin: new URL(BASE_URL).origin,
      localStorage: [
        { name: 'erp_access_token', value: body.token || body.accessToken },
        { name: 'erp_refresh_token', value: body.refreshToken || '' },
        { name: 'erp_user', value: JSON.stringify(user) },
      ],
    }],
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export default async function globalSetup() {
  try {
    await writeState(SUPER_ADMIN, STATE.superAdmin);
    await writeState(EMPLOYEE, STATE.employee);
  } catch (err) {
    throw new Error(`E2E setup could not log in — is the backend running at ${process.env.E2E_API_URL || 'http://localhost:8090'}?\n${err.message}`);
  }
}
