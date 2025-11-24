import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/report.dart';
import '../services/api_service.dart';

class ReportState {
  final List<Report> reports;
  final bool isLoading;
  final String? error;
  final int total;
  final int page;
  final int limit;
  final Map<String, dynamic>? lastResponse; // Store last API response

  ReportState({
    this.reports = const [],
    this.isLoading = false,
    this.error,
    this.total = 0,
    this.page = 1,
    this.limit = 20,
    this.lastResponse,
  });

  ReportState copyWith({
    List<Report>? reports,
    bool? isLoading,
    String? error,
    int? total,
    int? page,
    int? limit,
    Map<String, dynamic>? lastResponse,
  }) {
    return ReportState(
      reports: reports ?? this.reports,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      total: total ?? this.total,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      lastResponse: lastResponse ?? this.lastResponse,
    );
  }
}

class ReportNotifier extends StateNotifier<ReportState> {
  final ApiService _apiService = ApiService();

  ReportNotifier() : super(ReportState()) {
    fetchReports();
  }

  Future<void> fetchReports({Map<String, dynamic>? filters, bool refresh = false}) async {
    if (refresh) {
      state = state.copyWith(page: 1);
    }

    state = state.copyWith(isLoading: true, error: null);

    try {
      final queryParams = {
        'page': state.page,
        'limit': state.limit,
        ...?filters,
      };

      final response = await _apiService.getReports(queryParams: queryParams);
      
      List<Report> reports = [];
      int total = 0;

      if (response.data is List) {
        reports = (response.data as List)
            .map((json) => Report.fromJson(json))
            .toList();
      } else if (response.data is Map) {
        final data = response.data as Map<String, dynamic>;
        if (data['data'] != null) {
          reports = (data['data'] as List)
              .map((json) => Report.fromJson(json))
              .toList();
        } else {
          reports = (data['reports'] as List? ?? [])
              .map((json) => Report.fromJson(json))
              .toList();
        }
        total = data['total'] ?? reports.length;
      }

      state = state.copyWith(
        reports: refresh ? reports : [...state.reports, ...reports],
        isLoading: false,
        total: total,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<bool> createReport(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _apiService.createReport(data);
      final responseData = response.data is Map 
          ? Map<String, dynamic>.from(response.data as Map) 
          : <String, dynamic>{};
      final newReport = Report.fromJson(responseData);

      state = state.copyWith(
        reports: [newReport, ...state.reports],
        isLoading: false,
        lastResponse: responseData, // Store response untuk access locationWarning
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  // Get last response untuk access locationWarning, locationMismatch, dll
  Map<String, dynamic>? getLastResponse() {
    return state.lastResponse;
  }

  Future<bool> updateReportStatus(int id, String status, {String? notes}) async {
    try {
      await _apiService.updateReportStatus(id, status, notes: notes);
      
      state = state.copyWith(
        reports: state.reports.map((report) {
          if (report.id == id) {
            return Report(
              id: report.id,
              userId: report.userId,
              title: report.title,
              description: report.description,
              location: report.location,
              category: report.category,
              urgency: report.urgency,
              status: status,
              aiSummary: report.aiSummary,
              blockchainTxHash: report.blockchainTxHash,
              imageUrl: report.imageUrl,
              latitude: report.latitude,
              longitude: report.longitude,
              createdAt: report.createdAt,
              updatedAt: DateTime.now(),
              userName: report.userName,
              userEmail: report.userEmail,
              rtRw: report.rtRw,
            );
          }
          return report;
        }).toList(),
      );

      return true;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  void refresh() {
    fetchReports(refresh: true);
  }
}

final reportProvider = StateNotifierProvider<ReportNotifier, ReportState>((ref) {
  return ReportNotifier();
});

