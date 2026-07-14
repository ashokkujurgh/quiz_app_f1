import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../auth/state/auth_controller.dart';
import '../state/active_thread_controller.dart';
import '../state/conversations_controller.dart';
import '../widgets/message_bubble.dart';
import '../widgets/typing_indicator.dart';

class MessageThreadScreen extends ConsumerStatefulWidget {
  const MessageThreadScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<MessageThreadScreen> createState() => _MessageThreadScreenState();
}

class _MessageThreadScreenState extends ConsumerState<MessageThreadScreen> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  final _picker = ImagePicker();
  bool _wasTyping = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(conversationsControllerProvider.notifier).setActiveConversation(widget.conversationId);
    });
  }

  @override
  void dispose() {
    ref.read(conversationsControllerProvider.notifier).setActiveConversation(null);
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onTextChanged(String value) {
    final isTyping = value.isNotEmpty;
    if (isTyping != _wasTyping) {
      _wasTyping = isTyping;
      ref.read(activeThreadControllerProvider(widget.conversationId).notifier).onTypingChanged(isTyping);
    }
  }

  Future<void> _send() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    _textController.clear();
    _wasTyping = false;
    await ref.read(activeThreadControllerProvider(widget.conversationId).notifier).sendText(text);
    _scrollToBottom();
  }

  Future<void> _pickImage() async {
    final file = await _picker.pickImage(source: ImageSource.gallery);
    if (file == null) return;
    await ref.read(activeThreadControllerProvider(widget.conversationId).notifier).sendImage(file.path);
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final threadAsync = ref.watch(activeThreadControllerProvider(widget.conversationId));
    final me = ref.watch(authControllerProvider).valueOrNull;
    final conversations = ref.watch(conversationsControllerProvider).valueOrNull?.conversations ?? [];
    final matches = conversations.where((c) => c.id == widget.conversationId);
    final conversation = matches.isEmpty ? null : matches.first;

    ref.listen(activeThreadControllerProvider(widget.conversationId), (_, __) => _scrollToBottom());

    return Scaffold(
      appBar: AppBar(title: Text(conversation?.otherUser.name ?? 'Chat')),
      body: threadAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load messages: $err')),
        data: (thread) => Column(
          children: [
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: thread.messages.length,
                itemBuilder: (context, index) {
                  final message = thread.messages[index];
                  return MessageBubble(message: message, isMine: message.senderId == me?.id);
                },
              ),
            ),
            if (thread.otherUserTyping) const TypingIndicator(),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  children: [
                    IconButton(icon: const Icon(Icons.image_outlined), onPressed: _pickImage),
                    Expanded(
                      child: TextField(
                        controller: _textController,
                        onChanged: _onTextChanged,
                        decoration: const InputDecoration(hintText: 'Message…'),
                      ),
                    ),
                    IconButton(icon: const Icon(Icons.send), onPressed: _send),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
