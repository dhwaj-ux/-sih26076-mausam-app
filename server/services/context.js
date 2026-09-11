/**
 * Server-side context builder.
 * The implementation lives in public/js/context.js so the browser (standalone
 * mode) and the backend share exactly the same persona-scoped prompt.
 */
'use strict';

module.exports = require('../../public/js/context.js');
