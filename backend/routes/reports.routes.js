const express = require('express');
const pool = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { processReport } = require('../services/aiService');
const { logReportToBlockchain } = require('../services/blockchainService');
const { ethers } = require('ethers');

const router = express.Router();

// Create report
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, location } = req.body;
    const userId = req.user.userId;
    
    // Process with AI
    const fullText = `${title}. ${description}`;
    const aiResult = await processReport(fullText);
    
    // Insert report with AI results
    const result = await pool.query(
      `INSERT INTO reports (user_id, title, description, location, category, urgency, ai_summary, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') 
       RETURNING *`,
      [userId, title, description, location, aiResult.category, aiResult.urgency, aiResult.summary]
    );
    
    // Log AI processing
    await pool.query(
      `INSERT INTO ai_processing_log (report_id, original_text, ai_summary, ai_category, ai_urgency, processing_time_ms) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [result.rows[0].id, fullText, aiResult.summary, aiResult.category, aiResult.urgency, aiResult.processingTime]
    );
    
    // Insert initial status history
    await pool.query(
      `INSERT INTO report_status_history (report_id, status, updated_by) 
       VALUES ($1, 'pending', $2)`,
      [result.rows[0].id, userId]
    );
    
    // Log to blockchain dengan enkripsi data sensitif
    const metaHash = ethers.id(fullText).substring(0, 10);
    const reportData = {
      title: result.rows[0].title,
      description: result.rows[0].description,
      location: result.rows[0].location,
    };
    const txHash = await logReportToBlockchain(
      result.rows[0].id,
      'pending',
      metaHash,
      reportData // Pass reportData untuk enkripsi
    );
    
    if (txHash) {
      await pool.query(
        'UPDATE reports SET blockchain_tx_hash = $1 WHERE id = $2',
        [txHash, result.rows[0].id]
      );
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all reports (with filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, category, urgency, limit, offset, search } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Untuk warga, hanya tampilkan laporan mereka sendiri
    // Untuk pengurus/admin, tampilkan semua laporan
    let query = 'SELECT r.*, u.name as user_name, u.email as user_email FROM reports r JOIN users u ON r.user_id = u.id WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    // Filter berdasarkan role
    if (userRole === 'warga') {
      // Warga hanya lihat laporan mereka sendiri
      query += ` AND r.user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    } else if (['ketua_rt', 'sekretaris_rt', 'admin_rw'].includes(userRole)) {
      // Untuk RT/RW, filter berdasarkan RT/RW user (jika ada)
      const userResult = await pool.query('SELECT rt_rw FROM users WHERE id = $1', [userId]);
      const userRtRw = userResult.rows[0]?.rt_rw;
      if (userRtRw && userRtRw.trim() !== '') {
        // Filter berdasarkan RT/RW di location atau user rt_rw
        query += ` AND (r.location ILIKE $${paramCount} OR u.rt_rw ILIKE $${paramCount})`;
        const rtRwPattern = `%${userRtRw}%`;
        params.push(rtRwPattern);
        paramCount++;
      }
      // Jika tidak ada rt_rw, tampilkan semua (untuk testing/development)
    } else if (userRole === 'pengurus') {
      // Pengurus bisa lihat semua laporan (tidak ada filter tambahan)
    }
    // Admin sistem bisa lihat semua (tidak ada filter tambahan)
    
    // Tampilkan semua status (pending, in_progress, resolved, cancelled)
    // Kecuali jika user request filter status spesifik
    
    if (status) {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (category) {
      query += ` AND r.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (urgency) {
      query += ` AND r.urgency = $${paramCount}`;
      params.push(urgency);
      paramCount++;
    }
    
    if (search) {
      query += ` AND (r.title ILIKE $${paramCount} OR r.description ILIKE $${paramCount} OR r.location ILIKE $${paramCount} OR u.name ILIKE $${paramCount})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      paramCount += 4;
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    // Pagination
    if (limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
      paramCount++;
    }
    if (offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }
    
    const result = await pool.query(query, params);
    
    // Debug logging
    console.log(`[Reports API] Role: ${userRole}, UserId: ${userId}, Found ${result.rows.length} reports`);
    if (result.rows.length === 0 && userRole !== 'warga') {
      console.log(`[Reports API] Query: ${query}`);
      console.log(`[Reports API] Params:`, params);
    }
    
    // Get total count untuk pagination
    let countQuery = 'SELECT COUNT(*) FROM reports r JOIN users u ON r.user_id = u.id WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;
    
    if (userRole === 'warga') {
      countQuery += ` AND r.user_id = $${countParamCount}`;
      countParams.push(userId);
      countParamCount++;
    } else if (['ketua_rt', 'sekretaris_rt', 'admin_rw'].includes(userRole)) {
      const userResult = await pool.query('SELECT rt_rw FROM users WHERE id = $1', [userId]);
      const userRtRw = userResult.rows[0]?.rt_rw;
      if (userRtRw && userRtRw.trim() !== '') {
        countQuery += ` AND (r.location ILIKE $${countParamCount} OR u.rt_rw ILIKE $${countParamCount})`;
        countParams.push(`%${userRtRw}%`);
        countParamCount++;
      }
    } else if (userRole === 'pengurus') {
      // Pengurus bisa lihat semua laporan
    }
    // Admin sistem bisa lihat semua
    
    if (status) {
      countQuery += ` AND r.status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }
    if (category) {
      countQuery += ` AND r.category = $${countParamCount}`;
      countParams.push(category);
      countParamCount++;
    }
    if (urgency) {
      countQuery += ` AND r.urgency = $${countParamCount}`;
      countParams.push(urgency);
      countParamCount++;
    }
    if (search) {
      countQuery += ` AND (r.title ILIKE $${countParamCount} OR r.description ILIKE $${countParamCount} OR r.location ILIKE $${countParamCount} OR u.name ILIKE $${countParamCount})`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      data: result.rows,
      total,
      page: offset ? Math.floor(parseInt(offset) / parseInt(limit || 10)) + 1 : 1,
      limit: parseInt(limit || 10),
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(400).json({ error: error.message });
  }
});

// Analytics stats (admin/pengurus)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { period = 'day' } = req.query; // 'day', 'week', 'month'
    
    // Dynamic time window based on period
    let timeSeriesQuery;
    if (period === 'day') {
      timeSeriesQuery = `
        SELECT
          to_char(date_trunc('day', created_at), 'DD Mon YYYY') as label,
          date_trunc('day', created_at) as date_key,
          COUNT(*)::int as count
        FROM reports
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at) ASC
      `;
    } else if (period === 'week') {
      timeSeriesQuery = `
        SELECT
          to_char(date_trunc('week', created_at), 'WW/YYYY') as label,
          date_trunc('week', created_at) as date_key,
          COUNT(*)::int as count
        FROM reports
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
        GROUP BY date_trunc('week', created_at)
        ORDER BY date_trunc('week', created_at) ASC
      `;
    } else { // month
      timeSeriesQuery = `
        SELECT
          to_char(date_trunc('month', created_at), 'Mon YYYY') as label,
          date_trunc('month', created_at) as date_key,
          COUNT(*)::int as count
        FROM reports
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) ASC
      `;
    }

    const timeSeries = await pool.query(timeSeriesQuery);

    const byStatus = await pool.query(
      `
      SELECT status, COUNT(*)::int as count
      FROM reports
      GROUP BY status
      `
    );

    const byCategory = await pool.query(
      `
      SELECT COALESCE(category, 'unknown') as category, COUNT(*)::int as count
      FROM reports
      GROUP BY COALESCE(category, 'unknown')
      `
    );

    const byUrgency = await pool.query(
      `
      SELECT COALESCE(urgency, 'unknown') as urgency, COUNT(*)::int as count
      FROM reports
      GROUP BY COALESCE(urgency, 'unknown')
      `
    );

    const totals = await pool.query(
      `
      SELECT
        COUNT(*)::int as total_reports,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END)::int as resolved_reports,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)::int as in_progress_reports,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int as pending_reports,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)::int as cancelled_reports
      FROM reports
      `
    );

    res.json({
      timeSeries: timeSeries.rows,
      byStatus: byStatus.rows,
      byCategory: byCategory.rows,
      byUrgency: byUrgency.rows,
      totals: totals.rows[0],
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get single report
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await pool.query(
      `SELECT r.*, u.name as user_name, u.rt_rw 
       FROM reports r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.id = $1`,
      [id]
    );
    
    if (report.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Get status history
    const history = await pool.query(
      `SELECT h.*, u.name as updated_by_name 
       FROM report_status_history h 
       JOIN users u ON h.updated_by = u.id 
       WHERE h.report_id = $1 
       ORDER BY h.created_at ASC`,
      [id]
    );
    
    res.json({
      ...report.rows[0],
      history: history.rows
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update report status (pengurus only)
router.patch('/:id/status', authenticate, requireRole(['pengurus','admin','sekretaris_rt','ketua_rt','admin_rw']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.userId;
    
    // Update report
    await pool.query(
      `UPDATE reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, id]
    );
    
    // Log to blockchain
    const metaHash = ethers.id(`${id}-${status}`).substring(0, 10);
    const txHash = await logReportToBlockchain(id, status, metaHash);
    
    // Add to history
    await pool.query(
      `INSERT INTO report_status_history (report_id, status, notes, updated_by, blockchain_tx_hash) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, status, notes, userId, txHash]
    );
    
    const updated = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel report (warga only, hanya jika status masih pending)
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Cek apakah laporan milik user (untuk warga) atau user adalah admin
    const reportResult = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Laporan tidak ditemukan' });
    }
    
    const report = reportResult.rows[0];
    
    // Warga hanya bisa cancel laporan mereka sendiri
    // Admin/pengurus bisa cancel laporan apapun
    if (userRole === 'warga' && report.user_id !== userId) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk membatalkan laporan ini' });
    }
    
    // Hanya bisa cancel jika status masih pending
    if (report.status !== 'pending') {
      return res.status(400).json({ 
        error: `Laporan tidak bisa dibatalkan karena status sudah ${report.status}. Hanya laporan dengan status "pending" yang bisa dibatalkan.` 
      });
    }
    
    // Update status ke cancelled
    await pool.query(
      `UPDATE reports SET status = 'cancelled', cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [reason || 'Dibatalkan oleh pengguna', id]
    );
    
    // Log ke blockchain
    const metaHash = ethers.id(`${id}-cancelled-${reason || ''}`).substring(0, 10);
    const txHash = await logReportToBlockchain(id, 'cancelled', metaHash);
    
    // Add to history
    await pool.query(
      `INSERT INTO report_status_history (report_id, status, notes, updated_by, blockchain_tx_hash) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, 'cancelled', reason || 'Laporan dibatalkan oleh pengguna', userId, txHash]
    );
    
    const updated = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    res.json({ 
      success: true, 
      report: updated.rows[0],
      message: 'Laporan berhasil dibatalkan. Status perubahan telah dicatat di blockchain untuk transparansi.'
    });
  } catch (error) {
    console.error('Error cancelling report:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

