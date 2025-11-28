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

  // Detect face dari foto (base64) - untuk real-time detection, tidak perlu auth
  Future<Response> detectFaceFromPhoto(String photoBase64) async {
    return await _dio.post(ApiConfig.faceDetect, data: {
      'photo': photoBase64,
    });
  }

  // Register face dari foto (base64) - backend akan extract embedding otomatis
  Future<Response> registerFaceFromPhoto(String photoBase64) async {
    return await _dio.post(ApiConfig.faceRegister, data: {
      'photo': photoBase64,
    });
  }

  // Verify face dari foto (base64) - backend akan extract embedding dan compare otomatis
  Future<Response> verifyFaceFromPhoto(String photoBase64) async {
    return await _dio.post(ApiConfig.faceVerify, data: {
      'photo': photoBase64,
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
  Future<Response> sendChatMessage(
    String message,
    List<Map<String, dynamic>> messages, {
    bool newSession = false,
    Map<String, double>? location,
  }) async {
    final data = <String, dynamic>{
      'message': message,
      'messages': messages,
      'newSession': newSession,
    };
    
    // Tambahkan lokasi GPS jika tersedia
    if (location != null && location['latitude'] != null && location['longitude'] != null) {
      data['latitude'] = location['latitude']!;
      data['longitude'] = location['longitude']!;
    }
    
    return await _dio.post(ApiConfig.chat, data: data);
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

  // Email Verification
  Future<Response> sendVerificationCode(String email, {String type = 'registration'}) async {
    return await _dio.post(ApiConfig.sendVerificationCode, data: {
      'email': email,
      'type': type,
    });
  }

  Future<Response> verifyCode(String email, String code, {String type = 'registration'}) async {
    return await _dio.post(ApiConfig.verifyCode, data: {
      'email': email,
      'code': code,
      'type': type,
    });
  }

  // Profile
  Future<Response> updateProfile({String? name, String? jenisKelamin}) async {
    return await _dio.patch(ApiConfig.updateProfile, data: {
      if (name != null) 'name': name,
      if (jenisKelamin != null) 'jenis_kelamin': jenisKelamin,
    });
  }

  Future<Response> changePassword(String currentPassword, String newPassword) async {
    return await _dio.patch(ApiConfig.changePassword, data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }
}

