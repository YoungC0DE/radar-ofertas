import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'docs', 'avaliacao-radar-ofertas.html');
const pdfPath = path.join(root, 'docs', 'avaliacao-radar-ofertas.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '18mm', right: '15mm', bottom: '18mm', left: '15mm' },
});
await browser.close();
console.log(`PDF gerado: ${pdfPath}`);
