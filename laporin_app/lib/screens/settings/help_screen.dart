import 'package:flutter/material.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bantuan'),
        backgroundColor: Colors.blue[600],
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSection(
            context,
            title: 'Cara Membuat Laporan',
            icon: Icons.report,
            children: [
              _buildStep(context, '1. Klik tombol "Buat Laporan" di dashboard'),
              _buildStep(context, '2. Isi form laporan dengan lengkap'),
              _buildStep(context, '3. Ambil foto kondisi yang dilaporkan'),
              _buildStep(context, '4. Pilih kategori dan tingkat urgensi'),
              _buildStep(context, '5. Klik "Kirim Laporan"'),
            ],
          ),
          const SizedBox(height: 24),
          _buildSection(
            context,
            title: 'Verifikasi Wajah (2FA)',
            icon: Icons.face,
            children: [
              _buildStep(context, '1. Buka menu Pengaturan'),
              _buildStep(context, '2. Pilih "Verifikasi Wajah"'),
              _buildStep(context, '3. Ikuti instruksi untuk mendaftarkan wajah'),
              _buildStep(context, '4. Pastikan pencahayaan cukup'),
              _buildStep(context, '5. Posisikan wajah di dalam garis bantu'),
            ],
          ),
          const SizedBox(height: 24),
          _buildSection(
            context,
            title: 'Status Laporan',
            icon: Icons.info,
            children: [
              _buildInfo(context, 'Pending', 'Laporan sedang menunggu ditinjau'),
              _buildInfo(context, 'In Progress', 'Laporan sedang ditangani'),
              _buildInfo(context, 'Resolved', 'Laporan telah selesai ditangani'),
              _buildInfo(context, 'Rejected', 'Laporan ditolak dengan alasan tertentu'),
            ],
          ),
          const SizedBox(height: 24),
          _buildSection(
            context,
            title: 'Kontak Support',
            icon: Icons.support_agent,
            children: [
              _buildContact(context, 'Email', 'support@laporin.com'),
              _buildContact(context, 'Telepon', '085174200764'),
              _buildContact(context, 'Jam Layanan', 'Senin - Jumat, 08:00 - 17:00 WIB'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSection(BuildContext context, {
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: Colors.blue[600], size: 24),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).brightness == Brightness.dark
                        ? Colors.grey[100]
                        : Colors.grey[900],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildStep(BuildContext context, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '• ',
            style: TextStyle(color: Colors.blue[600], fontSize: 16),
          ),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.grey[300]
                    : Colors.grey[700],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfo(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$label: ',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.grey[200]
                  : Colors.grey[900],
              fontSize: 14,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.grey[300]
                    : Colors.grey[700],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContact(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.grey[200]
                  : Colors.grey[900],
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              color: Colors.blue[600],
            ),
          ),
        ],
      ),
    );
  }
}

