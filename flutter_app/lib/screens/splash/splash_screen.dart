import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/laporin_logo.dart';
import '../auth/login_screen.dart';
import '../dashboard/dashboard_screen.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;
  bool _hasNavigated = false;

  @override
  void initState() {
    super.initState();
    
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeIn,
    ));

    _scaleAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    ));

    _animationController.forward();

    // Wait for auth state to load, then navigate
    _waitForAuthAndNavigate();
  }

  Future<void> _waitForAuthAndNavigate() async {
    // Wait minimum 1.5 seconds for splash animation
    await Future.delayed(const Duration(milliseconds: 1500));
    
    if (!mounted || _hasNavigated) return;
    
    // Wait for auth state to be loaded from storage
    // Check auth state multiple times to ensure it's loaded
    int attempts = 0;
    const maxAttempts = 15; // Max 1.5 seconds wait (15 * 100ms)
    
    while (attempts < maxAttempts && !_hasNavigated) {
      await Future.delayed(const Duration(milliseconds: 100));
      
      if (!mounted || _hasNavigated) return;
      
      try {
        final authState = ref.read(authProvider);
        
        // Check if auth is loaded
        // Auth is loaded if we can determine authentication status
        final hasToken = authState.token != null;
        final hasUser = authState.user != null;
        
        // Auth is loaded if:
        // 1. We have both token and user (authenticated)
        // 2. We have neither token nor user (not authenticated, loading complete)
        if ((hasToken && hasUser) || (!hasToken && !hasUser)) {
          if (mounted && !_hasNavigated) {
            _hasNavigated = true;
            _navigateToNext();
            return;
          }
        }
      } catch (e) {
        print('⚠️ Splash: Error reading auth state: $e');
        // Continue waiting or force navigation
      }
      
      attempts++;
    }
    
    // Fallback: navigate after max wait time (force navigation)
    if (mounted && !_hasNavigated) {
      print('⚠️ Splash: Timeout waiting for auth, forcing navigation');
      _hasNavigated = true;
      _navigateToNext();
    }
  }

  void _navigateToNext() {
    if (!mounted) return;
    
    // Use WidgetsBinding to ensure navigation happens after frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      
      final authState = ref.read(authProvider);
      
      // Navigate based on auth state
      final isAuthenticated = authState.isAuthenticated && 
                              authState.user != null && 
                              authState.token != null;
      
      print('🚀 Splash: Navigating to ${isAuthenticated ? "Dashboard" : "Login"}');
      
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => isAuthenticated
              ? const DashboardScreen()
              : const LoginScreen(),
        ),
      );
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5), // Elegant off-white with slight gray tint
      body: Center(
        child: AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return FadeTransition(
              opacity: _fadeAnimation,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Logo menggunakan reusable widget
                    const LaporInLogo(
                      size: 120,
                      showText: false,
                    ),
                    const SizedBox(height: 32),
                    // LAPORIN Text
                    Text(
                      'LAPORIN',
                      style: GoogleFonts.inter(
                        fontSize: 42,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF00D4FF), // Light cyan
                        letterSpacing: 2,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Tagline
                    Text(
                      'keluhan? keresahan? Laporin aja di laporin',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontStyle: FontStyle.italic,
                        color: const Color(0xFF00D4FF).withValues(alpha: 0.8),
                        letterSpacing: 0.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 48),
                    // Loading indicator
                    const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(
                          Color(0xFF00D4FF),
                        ),
                        strokeWidth: 2.5,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

