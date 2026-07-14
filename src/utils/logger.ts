import pino from 'pino';

import { env } from '../config/env.js';
import { createLogCaptureStream } from './log-store.js';

const level = env.NODE_ENV === 'production' ? 'info' : 'debug';

export const logger = pino(
  { level },
  pino.multistream([
    { stream: process.stdout },
    { stream: createLogCaptureStream(), level: 'debug' },
  ]),
);
