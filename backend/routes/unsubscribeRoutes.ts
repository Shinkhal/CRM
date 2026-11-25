import express from 'express';
import { unsubscribe } from '../controllers/logController.js';

const router = express.Router();

/**
 * Public on purpose: this endpoint is the target of the one-click unsubscribe
 * link inside a campaign email. The HMAC token in the query string is the
 * authorisation.
 */
router.get('/', unsubscribe);

export default router;
