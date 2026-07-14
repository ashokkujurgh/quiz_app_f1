import 'package:flutter/material.dart';

/// Exact color tokens ported from quizapp/src/app/theme/muiTheme.ts
class AppColors {
  AppColors._();

  static const Color primary = Color(0xFF5563DE);
  static const Color primaryDark = Color(0xFF3D4DCC);
  static const Color secondary = Color(0xFFE91E8C);

  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // Light theme
  static const Color lightBackground = Color(0xFFF0F2F5);
  static const Color lightPaper = Color(0xFFFFFFFF);
  static const Color lightTextPrimary = Color(0xFF1A1A2E);
  static const Color lightTextSecondary = Color(0xFF57606A);
  static const Color lightDivider = Color(0x14000000); // rgba(0,0,0,0.08)

  // Dark theme
  static const Color darkBackground = Color(0xFF0D1117);
  static const Color darkPaper = Color(0xFF161B22);
  static const Color darkTextPrimary = Color(0xFFE6EDF3);
  static const Color darkTextSecondary = Color(0xFF8B949E);
  static const Color darkDivider = Color(0x14FFFFFF); // rgba(255,255,255,0.08)
}
