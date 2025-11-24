import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';
import '../../services/api_service.dart';
import '../reports/create_report_screen.dart';
import '../../providers/report_provider.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isLoading = false;
  Map<String, dynamic>? _pendingReportDraft;
  File? _imageFile;
  String? _imageBase64;

  final List<String> _quickSuggestions = [
    'Cara buat laporan',
    'Status laporan saya',
    'Apa fungsi blockchain di sini?',
    'Tips membuat laporan yang jelas',
  ];

  @override
  void initState() {
    super.initState();
    // Initial message dari AI
    _messages.add({
      'role': 'assistant',
      'content': 'Halo! 👋 Saya Asisten LaporIn yang siap membantu Anda. Ada yang bisa dibantu hari ini? 😊',
      'timestamp': DateTime.now(),
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    
    if (image != null) {
      setState(() {
        _imageFile = File(image.path);
      });
      
      final bytes = await _imageFile!.readAsBytes();
      _imageBase64 = base64Encode(bytes);
      
      // Add image message
      setState(() {
        _messages.add({
          'role': 'user',
          'content': '[Gambar terlampir]',
          'imageUrl': _imageBase64,
          'timestamp': DateTime.now(),
        });
      });
      
      _scrollToBottom();
      await _sendMessageWithImage();
    }
  }

  Future<void> _sendMessageWithImage() async {
    if (_imageBase64 == null) return;
    
    setState(() => _isLoading = true);
    
    try {
      final response = await ApiService().sendChatMessage(
        '[Gambar terlampir]',
        _messages,
      );
      
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': response.data['response'] ?? response.data['message'] ?? 'Terima kasih atas gambar yang Anda kirim.',
          'reportData': response.data['reportData'],
          'timestamp': DateTime.now(),
        });
        _pendingReportDraft = response.data['reportData'];
        _isLoading = false;
        _imageBase64 = null;
        _imageFile = null;
      });
      
      _scrollToBottom();
    } catch (e) {
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': 'Maaf, terjadi kesalahan saat memproses gambar.',
          'timestamp': DateTime.now(),
        });
        _isLoading = false;
      });
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty && _imageBase64 == null) return;

    final userMessage = _messageController.text.trim();
    _messageController.clear();

    // Add user message
    setState(() {
      _messages.add({
        'role': 'user',
        'content': userMessage,
        'imageUrl': _imageBase64,
        'timestamp': DateTime.now(),
      });
      _isLoading = true;
    });

    _scrollToBottom();

    try {
      final response = await ApiService().sendChatMessage(userMessage, _messages);
      
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': response.data['response'] ?? response.data['message'] ?? response.data['reply'] ?? 'Maaf, terjadi kesalahan',
          'reportData': response.data['reportData'],
          'awaitingConfirmation': response.data['awaitingConfirmation'] ?? response.data['previewMode'] ?? false,
          'timestamp': DateTime.now(),
        });
        
        // Set pending draft jika ada reportData
        if (response.data['reportData'] != null) {
          _pendingReportDraft = response.data['reportData'];
        }
        
        // Jika report sudah dibuat otomatis
        if (response.data['reportCreated'] == true && response.data['reportId'] != null) {
          _pendingReportDraft = null;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Laporan berhasil dibuat via chatbot!'),
              backgroundColor: Colors.green,
            ),
          );
          // Refresh reports list
          ref.read(reportProvider.notifier).refresh();
        }
        
        _isLoading = false;
        _imageBase64 = null;
        _imageFile = null;
      });

      _scrollToBottom();
    } catch (e) {
      setState(() {
        _messages.add({
          'role': 'assistant',
          'content': 'Maaf, terjadi kesalahan. Silakan coba lagi.',
          'timestamp': DateTime.now(),
        });
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  Future<void> _createReportFromDraft() async {
    if (_pendingReportDraft == null) return;
    
    final draft = _pendingReportDraft!;
    
    // Navigate to create report screen dengan pre-filled data
    final result = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CreateReportScreen(
          initialData: {
            'title': draft['title'] ?? draft['judul'] ?? '',
            'description': draft['description'] ?? draft['deskripsi'] ?? '',
            'location': draft['location'] ?? draft['lokasi'] ?? '',
            'imageUrl': draft['imageUrl'] ?? draft['image_url'],
          },
        ),
      ),
    );
    
    if (result == true) {
      setState(() {
        _pendingReportDraft = null;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.smart_toy, size: 20),
            ),
            const SizedBox(width: 12),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Asisten LaporIn',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text(
                  'AI Assistant',
                  style: TextStyle(fontSize: 12),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: Colors.blue[600],
        foregroundColor: Colors.white,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.blue[600]!, Colors.indigo[600]!, Colors.purple[600]!],
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Messages List
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Colors.blue[400]!, Colors.purple[400]!],
                            ),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.smart_toy, size: 64, color: Colors.white),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Mulai chat dengan AI',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Coba tanyakan: "Saya ingin melaporkan jalan rusak"',
                          style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        // Quick Suggestions
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: _quickSuggestions.map((suggestion) {
                            return ActionChip(
                              label: Text(suggestion),
                              onPressed: () {
                                _messageController.text = suggestion;
                                _sendMessage();
                              },
                              backgroundColor: Colors.blue[50],
                              side: BorderSide(color: Colors.blue[200]!),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_isLoading ? 1 : 0) + (_pendingReportDraft != null ? 1 : 0),
                    itemBuilder: (context, index) {
                      // Pending Draft Card
                      if (_pendingReportDraft != null && index == _messages.length) {
                        final draft = _pendingReportDraft!;
                        return _buildDraftCard(draft);
                      }
                      
                      // Loading indicator
                      if (index == _messages.length + (_pendingReportDraft != null ? 1 : 0)) {
                        return Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [Colors.blue[400]!, Colors.purple[400]!],
                                  ),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.smart_toy, size: 20, color: Colors.white),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: Colors.grey[200]!),
                                  ),
                                  child: Row(
                                    children: [
                                      SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.blue[600]!),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Text(
                                        'AI sedang menganalisis...',
                                        style: TextStyle(color: Colors.grey[700]),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }
                      
                      // Adjust index untuk draft card
                      final messageIndex = index > _messages.length ? index - 1 : index;
                      final message = _messages[messageIndex];
                      final isUser = message['role'] == 'user';

                      return Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.75,
                          ),
                          child: Row(
                            mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (!isUser)
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [Colors.blue[500]!, Colors.purple[500]!],
                                    ),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.smart_toy, size: 16, color: Colors.white),
                                ),
                              if (!isUser) const SizedBox(width: 8),
                              Flexible(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  decoration: BoxDecoration(
                                    gradient: isUser
                                        ? LinearGradient(
                                            colors: [Colors.blue[600]!, Colors.indigo[600]!],
                                          )
                                        : null,
                                    color: isUser ? null : Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: isUser ? null : Border.all(color: Colors.grey[200]!),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.1),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (message['imageUrl'] != null)
                                        Container(
                                          margin: const EdgeInsets.only(bottom: 8),
                                          child: ClipRRect(
                                            borderRadius: BorderRadius.circular(8),
                                            child: Image.memory(
                                              base64Decode(message['imageUrl']),
                                              width: 200,
                                              height: 200,
                                              fit: BoxFit.cover,
                                            ),
                                          ),
                                        ),
                                      Text(
                                        message['content'],
                                        style: TextStyle(
                                          color: isUser ? Colors.white : Colors.black87,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _formatTime(message['timestamp'] as DateTime),
                                        style: TextStyle(
                                          color: isUser ? Colors.white70 : Colors.grey[600],
                                          fontSize: 10,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              if (isUser) const SizedBox(width: 8),
                              if (isUser)
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.grey[300],
                                    shape: BoxShape.circle,
                                  ),
                                  child: Container(
                                    width: 16,
                                    height: 16,
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [Colors.blue[500]!, Colors.indigo[500]!],
                                      ),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // Pending Draft Card (fixed at bottom)
          if (_pendingReportDraft != null && _messages.isNotEmpty)
            _buildDraftCard(_pendingReportDraft!),

          // Quick Suggestions (jika belum ada pesan atau baru mulai)
          if (_messages.length <= 1)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _quickSuggestions.map((suggestion) {
                  return ActionChip(
                    label: Text(suggestion),
                    onPressed: () {
                      _messageController.text = suggestion;
                      _sendMessage();
                    },
                    backgroundColor: Colors.blue[50],
                    side: BorderSide(color: Colors.blue[200]!),
                    labelStyle: TextStyle(color: Colors.blue[700]),
                  );
                }).toList(),
              ),
            ),

          // Input Area
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.2),
                  spreadRadius: 1,
                  blurRadius: 5,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(Icons.image, color: Colors.blue[600]),
                  onPressed: _pickImage,
                ),
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Tulis pesan...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      filled: true,
                      fillColor: Colors.grey[50],
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    maxLines: null,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: Colors.blue[600],
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white),
                    onPressed: _isLoading ? null : _sendMessage,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDraftCard(Map<String, dynamic> draft) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue[50]!, Colors.indigo[50]!],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue[300]!, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.edit_note, color: Colors.blue[700], size: 24),
              const SizedBox(width: 8),
              const Text(
                'Draft Laporan',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (draft['title'] != null || draft['judul'] != null)
            _buildDraftField('Judul', draft['title'] ?? draft['judul']),
          if (draft['description'] != null || draft['deskripsi'] != null)
            _buildDraftField('Deskripsi', draft['description'] ?? draft['deskripsi']),
          if (draft['location'] != null || draft['lokasi'] != null)
            _buildDraftField('Lokasi', draft['location'] ?? draft['lokasi']),
          if (draft['category'] != null || draft['kategori'] != null)
            Row(
              children: [
                Chip(
                  label: Text('Kategori: ${draft['category'] ?? draft['kategori']}'),
                  backgroundColor: Colors.blue[100],
                ),
                const SizedBox(width: 8),
                if (draft['urgency'] != null || draft['urgensi'] != null)
                  Chip(
                    label: Text('Urgensi: ${draft['urgency'] ?? draft['urgensi']}'),
                    backgroundColor: Colors.orange[100],
                  ),
              ],
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    setState(() {
                      _pendingReportDraft = null;
                    });
                  },
                  child: const Text('Batal'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _createReportFromDraft,
                  icon: const Icon(Icons.send, color: Colors.white),
                  label: const Text('Buat Laporan', style: TextStyle(color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue[600],
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDraftField(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 14),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
