import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Reusable LaporIn logo widget (same design as splash screen)
class LaporInLogo extends StatelessWidget {
  final double size;
  final bool showText;
  final TextStyle? textStyle;

  const LaporInLogo({
    super.key,
    this.size = 120,
    this.showText = false,
    this.textStyle,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Logo Container dengan design LaporIn
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: const Color(0xFF00D4FF), // Light cyan/blue
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: const Color(0xFF0099CC), // Darker blue outline
              width: 3,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF00D4FF).withOpacity(0.3),
                blurRadius: 20,
                spreadRadius: 5,
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Central horizontal element (stylized Q/eye)
              Container(
                width: size * 0.33,
                height: size * 0.067,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              // Curved lines extending from center
              CustomPaint(
                size: Size(size, size),
                painter: _LogoPainter(),
              ),
            ],
          ),
        ),
        if (showText) ...[
          const SizedBox(height: 16),
          Text(
            'LAPORIN',
            style: textStyle ??
                TextStyle(
                  fontSize: size * 0.35,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF00D4FF),
                  letterSpacing: 2,
                ),
          ),
        ],
      ],
    );
  }
}

// Custom painter untuk logo design
class _LogoPainter extends CustomPainter {
  const _LogoPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.167;

    // Draw curved lines extending from center
    // Top-left curve
    final path1 = Path();
    path1.moveTo(center.dx, center.dy);
    path1.quadraticBezierTo(
      center.dx - radius * 0.75,
      center.dy - radius * 0.5,
      center.dx - radius,
      center.dy - radius,
    );
    canvas.drawPath(path1, paint);

    // Top-right curve
    final path2 = Path();
    path2.moveTo(center.dx, center.dy);
    path2.quadraticBezierTo(
      center.dx + radius * 0.75,
      center.dy - radius * 0.5,
      center.dx + radius,
      center.dy - radius,
    );
    canvas.drawPath(path2, paint);

    // Bottom-left curve
    final path3 = Path();
    path3.moveTo(center.dx, center.dy);
    path3.quadraticBezierTo(
      center.dx - radius * 0.75,
      center.dy + radius * 0.5,
      center.dx - radius,
      center.dy + radius,
    );
    canvas.drawPath(path3, paint);

    // Bottom-right curve
    final path4 = Path();
    path4.moveTo(center.dx, center.dy);
    path4.quadraticBezierTo(
      center.dx + radius * 0.75,
      center.dy + radius * 0.5,
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

