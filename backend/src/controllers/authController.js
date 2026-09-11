const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    const user = await User.findOne({ where: { username } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is disabled' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });
    res.json({
      success: true,
      token,
      user: user.toJSON()
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ success: true, user: req.user.toJSON() });
}

module.exports = { login, me };
