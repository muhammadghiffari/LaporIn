import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiService {
  late Dio _dio;
  static final ApiService _instance = ApiService._internal();
  
  factory ApiService() => _instance;
  
  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Add token interceptor
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Token expired, clear auth
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove('token');
          await prefs.remove('user');
          // Navigate to login (handled by app)
        }
        return handler.next(error);
      },
    ));
  }

  Dio get dio => _dio;

  // Auth
  Future<Response> login(String email, String password) async {
    return await _dio.post(ApiConfig.login, data: {
      'email': email,
      'password': password,
    });
  }

  Future<Response> register(Map<String, dynamic> data) async {
    return await _dio.post(ApiConfig.register, data: data);
  }

  Future<Response> verifyFace(String faceDescriptor) async {
    return await _dio.post(ApiConfig.verifyFace, data: {
      'faceDescriptor': faceDescriptor,
    });
  }

  Future<Response> registerFace(String faceDescriptor) async {
    return await _dio.post(ApiConfig.registerFace, data: {
      'faceDescriptor': faceDescriptor,
    });
  }

  // Reports
  Future<Response> createReport(Map<String, dynamic> data) async {
    return await _dio.post(ApiConfig.reports, data: data);
  }

  Future<Response> getReports({Map<String, dynamic>? queryParams}) async {
    return await _dio.get(ApiConfig.reports, queryParameters: queryParams);
  }

  Future<Response> getReport(int id) async {
    return await _dio.get('${ApiConfig.reports}/$id');
  }

  Future<Response> updateReportStatus(int id, String status, {String? notes}) async {
    return await _dio.patch('${ApiConfig.reports}/$id/status', data: {
      'status': status,
      'notes': notes,
    });
  }

  Future<Response> cancelReport(int id, String reason) async {
    return await _dio.post('${ApiConfig.reports}/$id/cancel', data: {
      'reason': reason,
    });
  }

  // Stats
  Future<Response> getStats({String? period, String? rt, String? rw}) async {
    return await _dio.get(ApiConfig.reportStats, queryParameters: {
      if (period != null) 'period': period,
      if (rt != null) 'rt': rt,
      if (rw != null) 'rw': rw,
    });
  }

  // Chat
  Future<Response> sendChatMessage(String message, List<Map<String, dynamic>> messages) async {
    return await _dio.post(ApiConfig.chat, data: {
      'message': message,
      'messages': messages,
    });
  }

  // Users
  Future<Response> getUsers({Map<String, dynamic>? queryParams}) async {
    return await _dio.get(ApiConfig.users, queryParameters: queryParams);
  }

  // Reverse Geocoding
  Future<Response> reverseGeocode(double latitude, double longitude) async {
    return await _dio.post('/reports/reverse-geocode', data: {
      'latitude': latitude,
      'longitude': longitude,
    });
  }
}

