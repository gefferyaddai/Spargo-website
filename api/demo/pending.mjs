// Proxy for the search demo's follow-up on chains still being read → spargo-api's
// GET /api/public/search/pending (see _proxy.mjs)
import { demoProxy } from './_proxy.mjs';

export default demoProxy('/api/public/search/pending');
