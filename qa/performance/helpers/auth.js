import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api/v1';

export function login(email = 'anna.kowalski@example.com', password = 'Password123!') {
  const url = `${BASE_URL}/auth/login`;
  const payload = JSON.stringify({ email, password });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(url, payload, params);
  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login has access_token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.access_token;
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    throw new Error(`Authentication failed for ${email}: ${res.status} ${res.body}`);
  }

  const data = JSON.parse(res.body);
  return {
    token: data.access_token,
    user: data.user,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.access_token}`,
    },
  };
}
