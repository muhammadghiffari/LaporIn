import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthState {
  final User? user;
  final String? token;
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;
  final bool requiresFaceVerification;

  AuthState({
    this.user,
    this.token,
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
    this.requiresFaceVerification = false,
  });

  AuthState copyWith({
    User? user,
    String? token,
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
    bool? requiresFaceVerification,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      requiresFaceVerification:
          requiresFaceVerification ?? this.requiresFaceVerification,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _apiService = ApiService();
  bool _isLoadingFromStorage = true;

  AuthNotifier() : super(AuthState()) {
    // Load auth asynchronously
    _loadAuthFromStorage().catchError((error) {
      print('❌ Error in _loadAuthFromStorage: $error');
      // Ensure state is set even on error
      state = AuthState();
    });
  }

  bool get isLoadedFromStorage => !_isLoadingFromStorage;

  Future<void> _loadAuthFromStorage() async {
    try {
      _isLoadingFromStorage = true;
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final userJson = prefs.getString('user');

      print('🔍 Loading auth from storage...');
      print('   Token exists: ${token != null}');
      print('   User exists: ${userJson != null}');

      if (token != null && userJson != null) {
        try {
          final user = User.fromJson(jsonDecode(userJson));
          
          // Verify token is still valid by checking if it's not expired
          // (Basic check - in production, you might want to decode JWT and check expiry)
          state = state.copyWith(
            user: user,
            token: token,
            isAuthenticated: true,
            requiresFaceVerification: false,
          );
          print('✅ Auth restored from storage: ${user.email}');
          print('✅ Token: ${token.substring(0, 20)}...');
        } catch (e) {
          print('❌ Error parsing user from storage: $e');
          // Clear corrupted data
          await prefs.remove('token');
          await prefs.remove('user');
          state = AuthState();
        }
      } else {
        print('ℹ️ No saved auth found in storage - user needs to login');
        state = AuthState(); // Ensure state is cleared
      }
    } catch (e) {
      print('❌ Error loading auth from storage: $e');
      state = AuthState(); // Ensure state is cleared on error
    } finally {
      _isLoadingFromStorage = false;
      print('✅ Auth loading complete. isAuthenticated: ${state.isAuthenticated}');
    }
  }

  // Method to clear auth (called from API service on 401)
  Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    state = AuthState();
    print('🔒 Auth cleared (token expired or invalid)');
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _apiService.login(email, password);
      final requiresFaceVerification =
          response.data['requiresFaceVerification'] == true || 
          response.data['requiresFaceVerification'] == 'true';
      final hasFaceRegistered = 
          response.data['hasFaceRegistered'] == true || 
          response.data['hasFaceRegistered'] == 'true';
      
      print('🔐 Login response: requiresFaceVerification=$requiresFaceVerification, hasFaceRegistered=$hasFaceRegistered');
      
      if (response.data['requiresVerification'] == true && 
          response.data['isVerified'] == false) {
        state = state.copyWith(
          isLoading: false,
          error: 'Akun Anda belum diverifikasi oleh Admin RT/RW.',
        );
        return false;
      }

      final token = response.data['token'];
      final userPayload = Map<String, dynamic>.from(response.data['user'] ?? {});
      userPayload['hasFaceRegistered'] = hasFaceRegistered;

      // Batasi akses: aplikasi mobile khusus warga
      if ((userPayload['role'] ?? '').toString().toLowerCase() != 'warga') {
        state = state.copyWith(
          isLoading: false,
          error:
              'Aplikasi mobile LaporIn hanya dapat diakses oleh warga. Silakan gunakan portal web untuk peran lain.',
        );
        return false;
      }

      final user = User.fromJson(userPayload);

      // Save to storage (persistently)
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      await prefs.setString('user', jsonEncode(user.toJson()));
      
      // Verify save was successful by reading back
      final savedToken = prefs.getString('token');
      final savedUser = prefs.getString('user');
      
      if (savedToken != token || savedUser == null) {
        print('⚠️ Warning: Auth may not be saved correctly');
      } else {
        print('✅ Auth saved to storage: ${user.email}');
        if (savedToken != null && savedToken.length > 20) {
          print('✅ Token verified in storage: ${savedToken.substring(0, 20)}...');
        } else {
          print('✅ Token verified in storage');
        }
      }

      state = state.copyWith(
        user: user,
        token: token,
        isAuthenticated: true,
        isLoading: false,
        requiresFaceVerification: requiresFaceVerification,
      );

      // Return true only when backend truly requires face verification
      print('🔐 Login result: needsFaceVerification=$requiresFaceVerification');
      return requiresFaceVerification;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().contains('401') || e.toString().contains('403')
            ? 'Email atau password salah.'
            : 'Terjadi kesalahan. Silakan coba lagi.',
      );
      return false;
    }
  }

  Future<bool> verifyFace(List<double> faceDescriptor) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _apiService.verifyFace(jsonEncode(faceDescriptor));
      
      if (response.data['verified'] == true) {
        state = state.copyWith(
          isLoading: false,
          requiresFaceVerification: false,
        );
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'Verifikasi wajah gagal. Silakan coba lagi.',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Verifikasi wajah gagal. Silakan coba lagi.',
      );
      return false;
    }
  }

  Future<bool> register(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _apiService.register(data);
      final token = response.data['token'];
      final userPayload = Map<String, dynamic>.from(response.data['user'] ?? {});
      userPayload['hasFaceRegistered'] =
          response.data['faceRegistered'] ?? userPayload['hasFaceRegistered'];
      final user = User.fromJson(userPayload);

      // Save to storage (persistently)
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      await prefs.setString('user', jsonEncode(user.toJson()));
      
      // Verify save was successful by reading back
      final savedToken = prefs.getString('token');
      final savedUser = prefs.getString('user');
      
      if (savedToken != token || savedUser == null) {
        print('⚠️ Warning: Auth may not be saved correctly');
      } else {
        print('✅ Auth saved to storage: ${user.email}');
        if (savedToken != null && savedToken.length > 20) {
          print('✅ Token verified in storage: ${savedToken.substring(0, 20)}...');
        } else {
          print('✅ Token verified in storage');
        }
      }

      state = state.copyWith(
        user: user,
        token: token,
        isAuthenticated: true,
        isLoading: false,
        requiresFaceVerification: false,
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().contains('409')
            ? 'Email sudah terdaftar.'
            : 'Terjadi kesalahan. Silakan coba lagi.',
      );
      return false;
    }
  }

  Future<void> registerFace(List<double> faceDescriptor) async {
    try {
      await _apiService.registerFace(jsonEncode(faceDescriptor));
      // Update user state
      final updatedUser = state.user?.copyWith(hasFaceRegistered: true);
      if (updatedUser != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user', jsonEncode(updatedUser.toJson()));
        state = state.copyWith(user: updatedUser);
      }
    } catch (e) {
      throw Exception('Gagal mendaftarkan wajah: $e');
    }
  }

  // Method untuk update hasFaceRegistered setelah face registration dari photo
  Future<void> updateFaceRegisteredStatus() async {
    final updatedUser = state.user?.copyWith(hasFaceRegistered: true);
    if (updatedUser != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user', jsonEncode(updatedUser.toJson()));
      state = state.copyWith(user: updatedUser);
      print('✅ Updated hasFaceRegistered to true');
    }
  }

  // Method untuk update user profile
  Future<void> updateUserProfile(User updatedUser) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user', jsonEncode(updatedUser.toJson()));
    state = state.copyWith(user: updatedUser);
    print('✅ Updated user profile');
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    final tokenRemoved = await prefs.remove('token');
    final userRemoved = await prefs.remove('user');
    
    // Verify removal was successful
    if (!tokenRemoved || !userRemoved) {
      print('⚠️ Warning: Failed to remove auth from storage');
    } else {
      print('✅ Auth removed from storage');
    }
    
    state = AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

// Extension untuk User model
extension UserExtension on User {
  User copyWith({
    int? id,
    String? name,
    String? email,
    String? role,
    String? rtRw,
    String? gender,
    bool? isVerified,
    bool? hasFaceRegistered,
  }) {
    return User(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      rtRw: rtRw ?? this.rtRw,
      gender: gender ?? this.gender,
      isVerified: isVerified ?? this.isVerified,
      hasFaceRegistered: hasFaceRegistered ?? this.hasFaceRegistered,
    );
  }
}

