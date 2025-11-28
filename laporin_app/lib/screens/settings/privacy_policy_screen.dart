import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kebijakan Privasi'),
        backgroundColor: Colors.blue[600],
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Kebijakan Privasi LaporIn',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.grey[100]
                    : Colors.grey[900],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Terakhir diperbarui: ${DateTime.now().year}',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: '1. Pengumpulan Data',
              content:
                  'Kami mengumpulkan data yang Anda berikan saat mendaftar dan menggunakan aplikasi, termasuk:\n\n'
                  '• Informasi profil (nama, email, RT/RW)\n'
                  '• Foto dan data biometrik wajah untuk verifikasi\n'
                  '• Laporan yang Anda buat beserta lokasi GPS\n'
                  '• Data penggunaan aplikasi',
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: '2. Penggunaan Data',
              content:
                  'Data yang dikumpulkan digunakan untuk:\n\n'
                  '• Memverifikasi identitas Anda\n'
                  '• Memproses dan menindaklanjuti laporan\n'
                  '• Meningkatkan kualitas layanan\n'
                  '• Keamanan dan pencegahan penipuan',
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: '3. Perlindungan Data',
              content:
                  'Kami berkomitmen untuk melindungi data pribadi Anda:\n\n'
                  '• Data disimpan dengan enkripsi\n'
                  '• Akses data dibatasi hanya untuk keperluan operasional\n'
                  '• Data biometrik dienkripsi dan tidak dapat dibaca langsung\n'
                  '• Sistem keamanan diperbarui secara berkala',
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: '4. Pembagian Data',
              content:
                  'Data Anda tidak akan dibagikan kepada pihak ketiga kecuali:\n\n'
                  '• Diperlukan oleh hukum\n'
                  '• Dengan persetujuan Anda\n'
                  '• Untuk keperluan pelayanan (Admin RT/RW yang berwenang)',
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: '5. Hak Anda',
              content:
                  'Anda memiliki hak untuk:\n\n'
                  '• Mengakses data pribadi Anda\n'
                  '• Memperbarui atau menghapus data\n'
                  '• Menarik persetujuan penggunaan data\n'
                  '• Mengajukan keluhan terkait privasi',
            ),
            const SizedBox(height: 24),
            _buildSection(
              context,
              title: '6. Kontak',
              content:
                  'Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, '
                  'silahkan hubungi kami di:\n\n'
                  'Email: privacy@laporin.com\n'
                  'Telepon: 0800-1234-5678',
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(BuildContext context, {required String title, required String content}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
        const SizedBox(height: 12),
        Text(
          content,
          style: TextStyle(
            fontSize: 14,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.grey[300]
                : Colors.grey[700],
            height: 1.6,
          ),
        ),
      ],
    );
  }
}

