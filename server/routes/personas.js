/** GET /api/personas  ->  persona catalogue + state agronomy reference data */
'use strict';

const express = require('express');
const DATA = require('../../public/js/data.js');
const llm = require('../services/llm');

const router = express.Router();

router.get('/personas', (req, res) => {
  res.json({
    personas: DATA.PERSONAS,
    states: DATA.STATES,
    seasons: DATA.SEASONS,
    aiProvider: llm.activeProvider(),
  });
});

module.exports = router;
