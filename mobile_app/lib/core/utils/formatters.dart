/// Formats a duration given in minutes as "Xh Ym" once it's an hour or more,
/// otherwise "X min" — mirrors the same fix applied to the web app's quiz
/// cards (quizapp/src/app/utils/formatDuration.ts).
String formatDurationMinutes(int totalMinutes) {
  if (totalMinutes < 60) return '$totalMinutes min';
  final hours = totalMinutes ~/ 60;
  final minutes = totalMinutes % 60;
  return minutes == 0 ? '${hours}h' : '${hours}h ${minutes}m';
}
