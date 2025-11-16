const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');

const router = express.Router();

// Stats warga by gender
router.get('/stats/warga', async (req, res) => {
  try {
    const { period = 'day' } = req.query; // 'day', 'week', 'month'
    
    const total = await pool.query(`SELECT COUNT(*)::int AS total FROM users WHERE role = 'warga'`);
    const byGender = await pool.query(`
      SELECT COALESCE(jenis_kelamin, 'tidak_disediakan') AS jenis_kelamin, COUNT(*)::int AS count
      FROM users
      WHERE role = 'warga'
      GROUP BY COALESCE(jenis_kelamin, 'tidak_disediakan')
    `);
    
    // Growth data based on period
    let growthQuery;
    if (period === 'day') {
      growthQuery = `
        SELECT
          to_char(date_trunc('day', created_at), 'DD Mon YYYY') as label,
          date_trunc('day', created_at) as date_key,
          COUNT(*)::int as count
        FROM users
        WHERE role = 'warga' AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at) ASC
      `;
    } else if (period === 'week') {
      growthQuery = `
        SELECT
          to_char(date_trunc('week', created_at), 'WW/YYYY') as label,
          date_trunc('week', created_at) as date_key,
          COUNT(*)::int as count
        FROM users
        WHERE role = 'warga' AND created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY date_trunc('week', created_at)
        ORDER BY date_trunc('week', created_at) ASC
      `;
    } else { // month
      growthQuery = `
        SELECT
          to_char(date_trunc('month', created_at), 'Mon YYYY') as label,
          date_trunc('month', created_at) as date_key,
          COUNT(*)::int as count
        FROM users
        WHERE role = 'warga' AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) ASC
      `;
    }
    
    const growth = await pool.query(growthQuery);
    
    const totalWarga = total.rows[0].total;
    const laki = byGender.rows.find(r => r.jenis_kelamin === 'laki_laki')?.count || 0;
    const perempuan = byGender.rows.find(r => r.jenis_kelamin === 'perempuan')?.count || 0;
    res.json({
      total_warga: totalWarga,
      by_gender: byGender.rows,
      persentase: {
        laki_laki: totalWarga ? Math.round((laki / totalWarga) * 100) : 0,
        perempuan: totalWarga ? Math.round((perempuan / totalWarga) * 100) : 0
      },
      growth: growth.rows,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create user (admin sistem only)
router.post('/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya Admin Sistem yang dapat membuat user baru' });
    }
    
    const { email, password, name, role, rt_rw, jenis_kelamin } = req.body;
    
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, dan role wajib diisi' });
    }
    
    // Validasi role
    const validRoles = ['warga', 'pengurus', 'sekretaris_rt', 'ketua_rt', 'admin_rw', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }
    
    // Cek email sudah ada
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role, rt_rw, jenis_kelamin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role, rt_rw, jenis_kelamin, created_at',
      [email, passwordHash, name, role, rt_rw || null, jenis_kelamin || null]
    );
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, rt_rw, jenis_kelamin } = req.body;
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role, rt_rw, jenis_kelamin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, role, rt_rw, jenis_kelamin',
      [email, passwordHash, name, role, rt_rw, jenis_kelamin]
    );
    
    const token = jwt.sign(
      { userId: result.rows[0].id, role: result.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        rt_rw: user.rt_rw
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Hapus user (role-guarded). Untuk keamanan, batasi ke admin/admin_rw/ketua_rt/sekretaris_rt.
router.delete('/users/:id', async (req, res) => {
  try {
    // Simple guard: require Authorization header exists and role allowed
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const allowed = ['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt'];
    if (!allowed.includes(decoded.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { id } = req.params;
    // Prevent deleting other admins unless admin sistem
    if (decoded.role !== 'admin') {
      const target = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
      if (target.rows[0]?.role === 'admin') {
        return res.status(403).json({ error: 'Cannot delete admin' });
      }
    }
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List users (admin sistem only)
router.get('/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { role, search, limit = 50, offset = 0 } = req.query;
    const params = [];
    let q =
      'SELECT id, email, name, role, rt_rw, jenis_kelamin, created_at FROM users WHERE 1=1';
    let countQ = 'SELECT COUNT(*) FROM users WHERE 1=1';
    let idx = 1;
    const countParams = [];
    let countIdx = 1;
    
    if (role) {
      q += ` AND role = $${idx++}`;
      params.push(role);
      countQ += ` AND role = $${countIdx++}`;
      countParams.push(role);
    }
    if (search) {
      q += ` AND (LOWER(name) LIKE $${idx} OR LOWER(email) LIKE $${idx})`;
      params.push(`%${String(search).toLowerCase()}%`);
      idx++;
      countQ += ` AND (LOWER(name) LIKE $${countIdx} OR LOWER(email) LIKE $${countIdx})`;
      countParams.push(`%${String(search).toLowerCase()}%`);
      countIdx++;
    }
    q += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Number(limit), Number(offset));
    
    const result = await pool.query(q, params);
    const countResult = await pool.query(countQ, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      data: result.rows,
      total,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      limit: Number(limit),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

