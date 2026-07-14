import { loadLogsApi, loadLogsPage } from '../models/logs-model.js';
import { renderLogsPage } from '../views/logs.js';

export async function showLogsPage(searchParams: URLSearchParams): Promise<string> {
  const data = await loadLogsPage(searchParams);
  return renderLogsPage(data);
}

export async function getLogsJson(searchParams: URLSearchParams): Promise<string> {
  const data = await loadLogsApi(searchParams);
  return JSON.stringify(data);
}
