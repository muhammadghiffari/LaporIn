import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
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

    // Navigate setelah 3 detik
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        _navigateToNext();
      }
    });
  }

  void _navigateToNext() {
    final authState = ref.read(authProvider);
    
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => authState.isAuthenticated
            ? const DashboardScreen()
            : const LoginScreen(),
      ),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
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
                    // Logo Container dengan design LaporIn
                    Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: const Color(0xFF00D4FF), // Light cyan/blue
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: const Color(0xFF0099CC), // Darker blue outline
                          width: 3,
                        ),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Central horizontal element (stylized Q/eye)
                          Container(
                            width: 40,
                            height: 8,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          // Curved lines extending from center
                          CustomPaint(
                            size: const Size(120, 120),
                            painter: _LogoPainter(),
                          ),
                        ],
                      ),
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
                        color: const Color(0xFF00D4FF).withOpacity(0.8),
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
                        strokeWidth: 2,
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

// Custom painter untuk logo design
class _LogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = 20.0;

    // Draw curved lines extending from center
    // Top-left curve
    final path1 = Path();
    path1.moveTo(center.dx, center.dy);
    path1.quadraticBezierTo(
      center.dx - 15,
      center.dy - 10,
      center.dx - radius,
      center.dy - radius,
    );
    canvas.drawPath(path1, paint);

    // Top-right curve
    final path2 = Path();
    path2.moveTo(center.dx, center.dy);
    path2.quadraticBezierTo(
      center.dx + 15,
      center.dy - 10,
      center.dx + radius,
      center.dy - radius,
    );
    canvas.drawPath(path2, paint);

    // Bottom-left curve
    final path3 = Path();
    path3.moveTo(center.dx, center.dy);
    path3.quadraticBezierTo(
      center.dx - 15,
      center.dy + 10,
      center.dx - radius,
      center.dy + radius,
    );
    canvas.drawPath(path3, paint);

    // Bottom-right curve
    final path4 = Path();
    path4.moveTo(center.dx, center.dy);
    path4.quadraticBezierTo(
      center.dx + 15,
      center.dy + 10,
      center.dx + radius,
      center.dy + radius,
    );
    canvas.drawPath(path4, paint);

    // Draw small circles/spirals at the ends
    _drawSpiral(canvas, Offset(center.dx - radius, center.dy - radius), paint);
    _drawSpiral(canvas, Offset(center.dx + radius, center.dy - radius), paint);
    _drawSpiral(canvas, Offset(center.dx - radius, center.dy + radius), paint);
    _drawSpiral(canvas, Offset(center.dx + radius, center.dy + radius), paint);
  }

  void _drawSpiral(Canvas canvas, Offset center, Paint paint) {
    // Draw a simple spiral using arcs
    final spiralPath = Path();
    for (int i = 0; i < 3; i++) {
      final radius = 4.0 - (i * 1.2);
      final rect = Rect.fromCircle(center: center, radius: radius);
      spiralPath.addArc(rect, i * math.pi / 2, math.pi);
    }
    canvas.drawPath(spiralPath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

