// backend/api/rooms/routes.js
const express = require('express');
const router = express.Router();
const { createSession, joinSession } = require('./roomController');
const { protect } = require('../../middleware/authMiddleware');

router.post('/create', protect, createSession);
router.post('/join', protect, joinSession);

module.exports = router;