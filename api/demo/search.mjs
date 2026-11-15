// Proxy for the homepage search demo (js/demo-search.js) → spargo-api's GET /api/public/search
// (see _proxy.mjs)
import { demoProxy } from './_proxy.mjs';

export default demoProxy('/api/public/search');
