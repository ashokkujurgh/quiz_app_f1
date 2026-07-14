import 'package:flutter/material.dart';

class CountdownRing extends StatelessWidget {
  const CountdownRing({super.key, required this.secondsLeft, required this.totalSeconds});

  final int secondsLeft;
  final int totalSeconds;

  @override
  Widget build(BuildContext context) {
    final progress = totalSeconds > 0 ? (secondsLeft / totalSeconds).clamp(0.0, 1.0) : 0.0;
    final urgent = secondsLeft <= 10 && secondsLeft > 0;
    final color = urgent ? Theme.of(context).colorScheme.error : Theme.of(context).colorScheme.primary;

    return SizedBox(
      width: 56,
      height: 56,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CircularProgressIndicator(
            value: progress,
            strokeWidth: 4,
            color: color,
            backgroundColor: color.withValues(alpha: 0.15),
          ),
          Text('$secondsLeft', style: TextStyle(fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }
}
