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

  AuthState({
    this.user,
    this.token,
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    User? user,
    String? token,
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _apiService = ApiService();

  AuthNotifier() : super(AuthState()) {
    _loadAuthFromStorage();
  }

  Future<void> _loadAuthFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final userJson = prefs.getString('user');

      if (token != null && userJson != null) {
        final user = User.fromJson(jsonDecode(userJson));
        state = state.copyWith(
          user: user,
          token: token,
          isAuthenticated: true,
        );
      }
    } catch (e) {
      print('Error loading auth from storage: $e');
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _apiService.login(email, password);
      
      if (response.data['requiresVerification'] == true && 
          response.data['isVerified'] == false) {
        state = state.copyWith(
          isLoading: false,
          error: 'Akun Anda belum diverifikasi oleh Admin RT/RW.',
        );
        return false;
      }

      final token = response.data['token'];
      final user = User.fromJson(response.data['user']);
      final hasFaceRegistered = response.data['hasFaceRegistered'] ?? false;

      // Save to storage
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      await prefs.setString('user', jsonEncode(user.toJson()));

      state = state.copyWith(
        user: user,
        token: token,
        isAuthenticated: true,
        isLoading: false,
      );

      // Return true if face verification needed
      return hasFaceRegistered;
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
        state = state.copyWith(isLoading: false);
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
      final user = User.fromJson(response.data['user']);

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      await prefs.setString('user', jsonEncode(user.toJson()));

      state = state.copyWith(
        user: user,
        token: token,
        isAuthenticated: true,
        isLoading: false,
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

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    
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

