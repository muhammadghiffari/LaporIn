class ApiConfig {
  // Production API URL (Railway)
  // Untuk development lokal, gunakan: http://10.90.229.46:3001/api
  // Untuk Android Emulator: http://10.0.2.2:3001/api
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api-laporin.up.railway.app/api', // Railway production URL
  );
  
  // Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String verifyFace = '/auth/verify-face';
  static const String registerFace = '/auth/register-face';
  static const String faceDetect = '/auth/face/detect'; // Detect face dari foto (real-time, no auth)
  static const String faceRegister = '/auth/face/register'; // Upload foto, extract embedding otomatis
  static const String faceVerify = '/auth/face/verify'; // Upload foto, verify otomatis
  static const String sendVerificationCode = '/auth/send-verification-code'; // Send OTP via email
  static const String verifyCode = '/auth/verify-code'; // Verify OTP code
  static const String updateProfile = '/auth/profile'; // Update user profile
  static const String changePassword = '/auth/password'; // Change password
  static const String reports = '/reports';
  static const String reportStats = '/reports/stats';
  static const String chat = '/chat';
  static const String users = '/auth/users';
  
  // Timeout
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}

