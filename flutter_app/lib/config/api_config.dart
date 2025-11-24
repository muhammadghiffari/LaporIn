class ApiConfig {
  // ANDROID ONLY - Update dengan URL backend Anda
  // Untuk Android Emulator: http://10.0.2.2:3001/api
  // Untuk Device Fisik: http://192.168.20.39:3001/api (IP laptop WiFi)
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.20.39:3001/api', // IP laptop WiFi untuk device fisik
  );
  
  // Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String verifyFace = '/auth/verify-face';
  static const String registerFace = '/auth/register-face';
  static const String reports = '/reports';
  static const String reportStats = '/reports/stats';
  static const String chat = '/chat';
  static const String users = '/auth/users';
  
  // Timeout
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}

