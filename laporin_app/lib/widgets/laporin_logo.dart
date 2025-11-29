import 'package:flutter/material.dart';

/// Reusable LaporIn logo widget - Using icon.png
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
        Image.asset(
          'assets/images/icon.png',
          width: size,
          height: size,
          fit: BoxFit.contain,
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

