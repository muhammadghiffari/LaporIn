import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/report_provider.dart';
import '../../models/report.dart';
import 'report_detail_screen.dart';

class ReportsListScreen extends ConsumerStatefulWidget {
  final int? limit;

  const ReportsListScreen({super.key, this.limit});

  @override
  ConsumerState<ReportsListScreen> createState() => _ReportsListScreenState();
}

class _ReportsListScreenState extends ConsumerState<ReportsListScreen> {
  final TextEditingController _searchController = TextEditingController();
  String? _selectedStatus;
  String? _selectedCategory;
  String? _selectedUrgency;
  bool _showFilters = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Always refresh on init to prevent duplicates
      ref.read(reportProvider.notifier).fetchReports(refresh: true);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applyFilters() {
    final filters = <String, dynamic>{};
    if (_searchController.text.isNotEmpty) {
      filters['search'] = _searchController.text;
    }
    if (_selectedStatus != null) {
      filters['status'] = _selectedStatus;
    }
    if (_selectedCategory != null) {
      filters['category'] = _selectedCategory;
    }
    if (_selectedUrgency != null) {
      filters['urgency'] = _selectedUrgency;
    }
    ref.read(reportProvider.notifier).fetchReports(filters: filters, refresh: true);
  }

  void _clearFilters() {
    _searchController.clear();
    _selectedStatus = null;
    _selectedCategory = null;
    _selectedUrgency = null;
    ref.read(reportProvider.notifier).fetchReports(refresh: true);
  }

  Color _getStatusColorWidget(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'in_progress':
      case 'processing':
        return Colors.blue;
      case 'resolved':
      case 'completed':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final reportState = ref.watch(reportProvider);
    var reports = widget.limit != null
        ? reportState.reports.take(widget.limit!).toList()
        : reportState.reports;

    // Apply search filter locally if search text exists
    if (_searchController.text.isNotEmpty) {
      final searchText = _searchController.text.toLowerCase();
      reports = reports.where((report) {
        return report.title.toLowerCase().contains(searchText) ||
            report.description.toLowerCase().contains(searchText) ||
            report.location.toLowerCase().contains(searchText);
      }).toList();
    }

    // If limit is set (used in dashboard), show simple list without filters
    if (widget.limit != null) {
      if (reportState.isLoading && reports.isEmpty) {
        return const Center(child: CircularProgressIndicator());
      }

      if (reports.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(
                'Belum ada laporan',
                style: TextStyle(fontSize: 18, color: Colors.grey[600]),
              ),
            ],
          ),
        );
      }

      return ListView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: reports.length,
        itemBuilder: (context, index) {
          final report = reports[index];
          return _buildReportCard(report);
        },
      );
    }

    // Full screen with filters
    return Column(
      children: [
        // Search & Filter Bar
        Container(
          padding: const EdgeInsets.all(16),
          color: Theme.of(context).scaffoldBackgroundColor,
          child: Column(
            children: [
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Cari laporan...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            _applyFilters();
                            setState(() {});
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey[800]
                      : Colors.grey[50],
                ),
                onChanged: (value) {
                  setState(() {});
                },
                onSubmitted: (_) => _applyFilters(),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        setState(() => _showFilters = !_showFilters);
                      },
                      icon: Icon(_showFilters ? Icons.filter_alt : Icons.filter_alt_outlined),
                      label: const Text('Filter'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.blue[600],
                      ),
                    ),
                  ),
                  if (_selectedStatus != null || _selectedCategory != null || _selectedUrgency != null)
                    Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: TextButton(
                        onPressed: _clearFilters,
                        child: const Text('Reset'),
                      ),
                    ),
                ],
              ),
              if (_showFilters) _buildFilterOptions(),
            ],
          ),
        ),
        // Reports List
        Expanded(
          child: reportState.isLoading && reports.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : reports.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            'Belum ada laporan',
                            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () async {
                        _applyFilters();
                      },
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: reports.length,
                        itemBuilder: (context, index) {
                          final report = reports[index];
                          return _buildReportCard(report);
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildFilterOptions() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[800] : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Status Filter
          DropdownButtonFormField<String>(
            value: _selectedStatus,
            decoration: InputDecoration(
              labelText: 'Status',
              labelStyle: TextStyle(color: isDark ? Colors.grey[300] : Colors.grey[700]),
              prefixIcon: Icon(Icons.filter_list, color: isDark ? Colors.grey[300] : Colors.grey[700]),
              filled: true,
              fillColor: isDark ? Colors.grey[900] : Colors.white,
            ),
            items: [
              const DropdownMenuItem(value: null, child: Text('Semua Status')),
              const DropdownMenuItem(value: 'pending', child: Text('Pending')),
              const DropdownMenuItem(value: 'in_progress', child: Text('Sedang Diproses')),
              const DropdownMenuItem(value: 'resolved', child: Text('Selesai')),
              const DropdownMenuItem(value: 'cancelled', child: Text('Dibatalkan')),
            ],
            onChanged: (value) {
              setState(() => _selectedStatus = value);
              _applyFilters();
            },
          ),
          const SizedBox(height: 12),
          // Category Filter (tetap ada untuk filter, tapi tidak untuk input)
          DropdownButtonFormField<String>(
            value: _selectedCategory,
            decoration: InputDecoration(
              labelText: 'Kategori',
              labelStyle: TextStyle(color: isDark ? Colors.grey[300] : Colors.grey[700]),
              prefixIcon: Icon(Icons.category, color: isDark ? Colors.grey[300] : Colors.grey[700]),
              filled: true,
              fillColor: isDark ? Colors.grey[900] : Colors.white,
            ),
            items: [
              const DropdownMenuItem(value: null, child: Text('Semua Kategori')),
              const DropdownMenuItem(value: 'infrastruktur', child: Text('Infrastruktur')),
              const DropdownMenuItem(value: 'keamanan', child: Text('Keamanan')),
              const DropdownMenuItem(value: 'kebersihan', child: Text('Kebersihan')),
              const DropdownMenuItem(value: 'sosial', child: Text('Sosial')),
              const DropdownMenuItem(value: 'administrasi', child: Text('Administrasi')),
              const DropdownMenuItem(value: 'lainnya', child: Text('Lainnya')),
            ],
            onChanged: (value) {
              setState(() => _selectedCategory = value);
              _applyFilters();
            },
          ),
          const SizedBox(height: 12),
          // Urgency Filter (tetap ada untuk filter, tapi tidak untuk input)
          DropdownButtonFormField<String>(
            value: _selectedUrgency,
            decoration: InputDecoration(
              labelText: 'Urgensi',
              labelStyle: TextStyle(color: isDark ? Colors.grey[300] : Colors.grey[700]),
              prefixIcon: Icon(Icons.priority_high, color: isDark ? Colors.grey[300] : Colors.grey[700]),
              filled: true,
              fillColor: isDark ? Colors.grey[900] : Colors.white,
            ),
            items: [
              const DropdownMenuItem(value: null, child: Text('Semua Urgensi')),
              const DropdownMenuItem(value: 'tinggi', child: Text('Tinggi')),
              const DropdownMenuItem(value: 'sedang', child: Text('Sedang')),
              const DropdownMenuItem(value: 'rendah', child: Text('Rendah')),
            ],
            onChanged: (value) {
              setState(() => _selectedUrgency = value);
              _applyFilters();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildReportCard(Report report) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ReportDetailScreen(reportId: report.id),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image thumbnail
              if (report.imageUrl != null && report.imageUrl!.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: _buildImageThumbnail(report.imageUrl!),
                ),
                const SizedBox(height: 12),
              ],
              Row(
                children: [
                  Expanded(
                    child: Text(
                      report.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  if (report.isSensitive)
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(context).brightness == Brightness.dark
                            ? Colors.orange[900]!.withOpacity(0.3)
                            : Colors.orange[100],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Colors.orange[700]!,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.lock, size: 12, color: Colors.orange[700]),
                          const SizedBox(width: 4),
                          Text(
                            'SENSITIF',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Colors.orange[700],
                            ),
                          ),
                        ],
                      ),
                    ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? _getStatusColorWidget(report.status).withOpacity(0.2)
                          : _getStatusColorWidget(report.status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _getStatusColorWidget(report.status)
                            .withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.5 : 0.3),
                      ),
                    ),
                    child: Text(
                      report.status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: _getStatusColorWidget(report.status),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                report.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? Colors.grey[400]
                      : Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.location_on, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      report.location,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Chip(
                    label: Text(report.category),
                    labelStyle: const TextStyle(fontSize: 10),
                    padding: EdgeInsets.zero,
                  ),
                  const SizedBox(width: 8),
                  Chip(
                    label: Text(report.urgency),
                    labelStyle: const TextStyle(fontSize: 10),
                    padding: EdgeInsets.zero,
                    backgroundColor: Colors.orange[100],
                  ),
                  const Spacer(),
                  Text(
                    _formatDate(report.createdAt),
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays > 0) {
      return '${difference.inDays} hari lalu';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} jam lalu';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} menit lalu';
    } else {
      return 'Baru saja';
    }
  }

  Widget _buildImageThumbnail(String imageUrl) {
    // Check if it's a base64 data URL or regular URL
    if (imageUrl.startsWith('data:image') || imageUrl.startsWith('/9j/') || imageUrl.length > 1000) {
      // Base64 image
      try {
        String base64String = imageUrl;
        
        // Remove data URL prefix if exists
        if (base64String.contains(',')) {
          base64String = base64String.split(',')[1];
        }
        
        final imageBytes = base64Decode(base64String);
        return Image.memory(
          imageBytes,
          fit: BoxFit.cover,
          width: double.infinity,
          height: 200,
          errorBuilder: (context, error, stackTrace) {
            return Container(
              height: 200,
              color: Colors.grey[200],
              child: Icon(Icons.broken_image, color: Colors.grey[400]),
            );
          },
        );
      } catch (e) {
        return Container(
          height: 200,
          color: Colors.grey[200],
          child: Icon(Icons.broken_image, color: Colors.grey[400]),
        );
      }
    } else {
      // Regular URL (HTTP/HTTPS)
      return Image.network(
        imageUrl,
        fit: BoxFit.cover,
        width: double.infinity,
        height: 200,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Container(
            height: 200,
            color: Colors.grey[200],
            child: Center(
              child: CircularProgressIndicator(
                value: loadingProgress.expectedTotalBytes != null
                    ? loadingProgress.cumulativeBytesLoaded /
                        loadingProgress.expectedTotalBytes!
                    : null,
              ),
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          return Container(
            height: 200,
            color: Colors.grey[200],
            child: Icon(Icons.broken_image, color: Colors.grey[400]),
          );
        },
      );
    }
  }
}

