
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'judge', password: 'judge123', role: 'judge' },
];

// Login Route
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET || '', {
    expiresIn: '24h',
  });

  res.json({ token });
});

export default router;
