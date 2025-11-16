/**
 * Basic unit tests for Reports API
 * 
 * Run: npm test
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Mock server setup
const express = require('express');
const app = express();
app.use(express.json());

// Mock database pool
const mockPool = {
  query: jest.fn(),
};

// Mock services
jest.mock('../database/db', () => mockPool);
jest.mock('../services/aiService', () => ({
  processReport: jest.fn().mockResolvedValue({
    summary: 'Test summary',
    category: 'infrastruktur',
    urgency: 'medium',
    processingTime: 100,
  }),
}));
jest.mock('../services/blockchainService', () => ({
  logReportToBlockchain: jest.fn().mockResolvedValue('0x1234567890abcdef'),
}));

const reportsRoutes = require('../routes/reports.routes');
const { authenticate } = require('../middleware/auth');

app.use('/api/reports', authenticate, reportsRoutes);

describe('Reports API', () => {
  const mockUser = {
    userId: 1,
    role: 'warga',
  };

  const mockToken = jwt.sign(mockUser, process.env.JWT_SECRET || 'test_secret', {
    expiresIn: '7d',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/reports', () => {
    it('should create a report successfully', async () => {
      const mockReport = {
        id: 1,
        user_id: 1,
        title: 'Test Report',
        description: 'Test description',
        location: 'RT001/RW005',
        category: 'infrastruktur',
        urgency: 'medium',
        status: 'pending',
        ai_summary: 'Test summary',
        blockchain_tx_hash: '0x1234567890abcdef',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockReport] }) // Insert report
        .mockResolvedValueOnce({ rows: [] }) // AI log
        .mockResolvedValueOnce({ rows: [] }) // Status history
        .mockResolvedValueOnce({ rows: [{ ...mockReport, blockchain_tx_hash: '0x1234567890abcdef' }] }); // Update blockchain

      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          title: 'Test Report',
          description: 'Test description',
          location: 'RT001/RW005',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Test Report');
    });

    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({
          title: 'Test Report',
          description: 'Test description',
          location: 'RT001/RW005',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 if required fields missing', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Missing required fields'));

      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          title: 'Test Report',
          // Missing description and location
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/reports', () => {
    it('should get reports successfully', async () => {
      const mockReports = [
        {
          id: 1,
          user_id: 1,
          title: 'Test Report 1',
          status: 'pending',
        },
        {
          id: 2,
          user_id: 1,
          title: 'Test Report 2',
          status: 'resolved',
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockReports });

      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/reports/stats', () => {
    const mockPengurusToken = jwt.sign(
      { userId: 2, role: 'pengurus' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '7d' }
    );

    it('should get stats successfully for pengurus', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: 10 }] }) // Total
        .mockResolvedValueOnce({ rows: [{ status: 'pending', count: 5 }] }) // By status
        .mockResolvedValueOnce({ rows: [] }) // Weekly
        .mockResolvedValueOnce({ rows: [] }); // Monthly

      const response = await request(app)
        .get('/api/reports/stats')
        .set('Authorization', `Bearer ${mockPengurusToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_reports');
    });
  });
});

