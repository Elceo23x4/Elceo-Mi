import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';

const profile = __ENV.SEC_G_PROFILE || 'smoke';
const base = __ENV.SEC_G_BASE_URL || 'http://127.0.0.1:3000';
const profiles = {
  smoke: { vus: 1, duration: '10s' },
  ci: { vus: 5, duration: '30s' },
  'capacity-discovery': { stages: [{ duration: '30s', target: 5 }, { duration: '30s', target: 20 }, { duration: '30s', target: 40 }, { duration: '15s', target: 0 }] }
};
const workload = [
  ['account-read','GET','/api/account'], ['dashboard-read','GET','/api/dashboard'], ['portfolio-read','GET','/api/portfolio'],
  ['portfolio-mutation','POST','/api/portfolio'], ['journal-read','GET','/api/journal'], ['journal-mutation','POST','/api/journal'],
  ['notification-inbox','GET','/api/notifications/inbox'], ['ops-read','GET','/api/admin/ops'],
  ['provider-ingestion','POST','/api/internal/ingestion'], ['mixed-user','GET','/api/dashboard']
];
export const options = { scenarios: Object.fromEntries(workload.map(([name], index) => [name, { executor: 'constant-vus', vus: profiles[profile].vus || 1, duration: profiles[profile].duration || '30s', startTime: `${index}s`, tags: { scenario_name: name } }])), thresholds: { checks: ['rate==1'], unexpected_server_error: ['count==0'] } };
export default function () { const [name, method, path] = workload[exec.scenario.iterationInTest % workload.length]; const response = http.request(method, `${base}${path}`, method === 'POST' ? '{}' : null, { headers: { 'content-type':'application/json', 'x-sec-g-fixture': __ENV.SEC_G_FIXTURE_TOKEN || '' }, tags: { scenario_name:name } }); check(response, { 'no unexpected 5xx': (r) => r.status < 500 }); }
