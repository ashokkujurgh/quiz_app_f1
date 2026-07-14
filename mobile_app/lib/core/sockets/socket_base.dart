import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config/env.dart';

/// Shared helper for constructing a socket_io_client Socket pointed at a
/// specific Engine.IO path on the same origin as the REST API, matching the
/// nginx gateway routing verified in quizapp/nginx.conf:
///   /socket.io/  -> auth-service     (presence)
///   /messages.io/ -> message-service (chat)
///   /quiz.io/    -> quiz-service     (live quiz play)
io.Socket buildSocket({required String path, required String accessToken}) {
  return io.io(
    Env.apiBaseUrl,
    io.OptionBuilder()
        .setPath(path)
        .setTransports(['websocket', 'polling'])
        .setAuth({'token': accessToken})
        .disableAutoConnect()
        .build(),
  );
}
