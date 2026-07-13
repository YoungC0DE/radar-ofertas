import { loadDashboardData } from '../models/dashboard-model.js';
import { renderDashboard } from '../views/dashboard.js';

export async function showDashboard(options: {
  sendNowMessage?: string;
  sendNowError?: string;
} = {}): Promise<string> {
  const data = await loadDashboardData(options);
  return renderDashboard(data);
}
