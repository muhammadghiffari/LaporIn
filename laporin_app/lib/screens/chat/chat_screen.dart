import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'dart:io';
import 'dart:convert';
import '../../services/api_service.dart';
import '../../services/location_service.dart';
import '../../providers/report_provider.dart';
import '../reports/create_report_screen.dart';

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

  bool _localeInitialized = false;

  @override
  void initState() {
    super.initState();
    // Initialize locale data untuk DateFormat
    _initializeLocale();
    // Initial message dari AI
    _messages.add({
      'role': 'assistant',
      'content': 'Halo! 👋 Saya Asisten LaporIn yang siap membantu Anda. Ada yang bisa dibantu hari ini? 😊',
      'timestamp': DateTime.now(),
    });
  }

  Future<void> _initializeLocale() async {
    if (_localeInitialized) return;
    
    try {
      await initializeDateFormatting('id_ID', null);
      Intl.defaultLocale = 'id_ID';
      _localeInitialized = true;
      debugPrint('✅ Locale initialized: id_ID');
    } catch (e) {
      debugPrint('❌ Error initializing locale: $e');
      // Fallback ke default locale jika gagal
      try {
        await initializeDateFormatting('en_US', null);
        Intl.defaultLocale = 'en_US';
        _localeInitialized = true;
        debugPrint('✅ Fallback locale initialized: en_US');
      } catch (e2) {
        debugPrint('❌ Fallback locale also failed: $e2');
        Intl.defaultLocale = 'en_US';
        _localeInitialized = true;
      }
    }
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
      // Deteksi apakah ini chat baru (hanya ada initial message dari AI)
      final isNewSession = _messages.length <= 1;
      
      // Ambil lokasi GPS otomatis
      Map<String, double>? location;
      try {
        final position = await LocationService().getCurrentLocation();
        if (position != null) {
          location = {
            'latitude': position.latitude,
            'longitude': position.longitude,
          };
        }
      } catch (e) {
        debugPrint('Error getting location: $e');
      }
      
      final response = await ApiService().sendChatMessage(
        '[Gambar terlampir]',
        _prepareMessagesForApi(),
        newSession: isNewSession,
        location: location,
      );
      
      setState(() {
        final rawContent = response.data['response'] ?? response.data['message'] ?? response.data['reply'] ?? 'Terima kasih atas gambar yang Anda kirim.';
        
        // SELALU set reportData jika ada di response (untuk memastikan tombol muncul)
        final reportDataFromResponse = response.data['reportData'];
        
        _messages.add({
          'role': 'assistant',
          'content': _removeMarkdown(rawContent),
          'reportData': reportDataFromResponse, // SELALU sertakan reportData jika ada
          'awaitingConfirmation': response.data['awaitingConfirmation'] ?? response.data['previewMode'] ?? false,
          'timestamp': DateTime.now(),
        });
        
        // Set pending draft jika ada reportData (SELALU set untuk memastikan tombol CTA muncul)
        if (reportDataFromResponse != null) {
          _pendingReportDraft = Map<String, dynamic>.from(reportDataFromResponse);
          debugPrint('✅ Draft set dengan reportData (image): ${_pendingReportDraft}');
          debugPrint('✅ reportData keys: ${reportDataFromResponse.keys.toList()}');
        } else {
          _pendingReportDraft = null;
          debugPrint('⚠️ Tidak ada reportData dalam response (image)');
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
      // Deteksi apakah ini chat baru (hanya ada initial message dari AI)
      final isNewSession = _messages.length <= 1;
      
      // Ambil lokasi GPS otomatis
      Map<String, double>? location;
      try {
        final position = await LocationService().getCurrentLocation();
        if (position != null) {
          location = {
            'latitude': position.latitude,
            'longitude': position.longitude,
          };
        }
      } catch (e) {
        debugPrint('Error getting location: $e');
      }
      
      final response = await ApiService().sendChatMessage(
        userMessage,
        _prepareMessagesForApi(),
        newSession: isNewSession,
        location: location,
      );
      
      setState(() {
        final rawContent = response.data['response'] ?? response.data['message'] ?? response.data['reply'] ?? 'Maaf, terjadi kesalahan';
        
        // SELALU set reportData jika ada di response (untuk memastikan tombol muncul)
        final reportDataFromResponse = response.data['reportData'];
        
        _messages.add({
          'role': 'assistant',
          'content': _removeMarkdown(rawContent),
          'reportData': reportDataFromResponse, // SELALU sertakan reportData jika ada
          'awaitingConfirmation': response.data['awaitingConfirmation'] ?? response.data['previewMode'] ?? false,
          'timestamp': DateTime.now(),
        });
        
        // Set pending draft jika ada reportData (SELALU set untuk memastikan tombol CTA muncul)
        if (reportDataFromResponse != null) {
          _pendingReportDraft = Map<String, dynamic>.from(reportDataFromResponse);
          debugPrint('✅ Draft set dengan reportData: ${_pendingReportDraft}');
          debugPrint('✅ reportData keys: ${reportDataFromResponse.keys.toList()}');
        } else {
          // Clear draft jika tidak ada reportData
          _pendingReportDraft = null;
          debugPrint('⚠️ Tidak ada reportData dalam response');
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

  List<Map<String, dynamic>> _prepareMessagesForApi() {
    return _messages.map((message) {
      final timestamp = message['timestamp'];
      return {
        'role': message['role'],
        'content': message['content'],
        if (message['imageUrl'] != null) 'imageUrl': message['imageUrl'],
        if (timestamp is DateTime) 'timestamp': timestamp.toIso8601String(),
      };
    }).toList();
  }

  // Fungsi untuk menghilangkan markdown formatting (bintang, dll)
  String _removeMarkdown(String text) {
    if (text.isEmpty) return text;
    
    // Hapus bold markdown (**text** atau __text__) - gunakan replaceAllMapped untuk menghindari masalah dengan $
    text = text.replaceAllMapped(RegExp(r'\*\*(.*?)\*\*'), (match) => match.group(1) ?? '');
    text = text.replaceAllMapped(RegExp(r'__(.*?)__'), (match) => match.group(1) ?? '');
    
    // Hapus italic markdown (*text* atau _text_) - hati-hati dengan bold yang sudah dihapus
    text = text.replaceAllMapped(RegExp(r'(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)'), (match) => match.group(1) ?? '');
    text = text.replaceAllMapped(RegExp(r'(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)'), (match) => match.group(1) ?? '');
    
    // Hapus link markdown [text](url) - ambil text saja
    text = text.replaceAllMapped(RegExp(r'\[([^\]]+)\]\([^\)]+\)'), (match) => match.group(1) ?? '');
    
    // Hapus code markdown (`text`) - ambil text saja
    text = text.replaceAllMapped(RegExp(r'`([^`]+)`'), (match) => match.group(1) ?? '');
    
    // Hapus sisa markdown yang mungkin terlewat
    text = text.replaceAll(RegExp(r'\*\*'), ''); // Hapus sisa **
    text = text.replaceAll(RegExp(r'__'), ''); // Hapus sisa __
    text = text.replaceAll(RegExp(r'(?<!\*)\*(?!\*)'), ''); // Hapus sisa * (bukan **)
    text = text.replaceAll(RegExp(r'(?<!_)_(?!_)'), ''); // Hapus sisa _ (bukan __)
    text = text.replaceAll(RegExp(r'`'), ''); // Hapus sisa `
    
    // Bersihkan spasi berlebihan
    text = text.replaceAll(RegExp(r'\s+'), ' ');
    text = text.trim();
    
    return text;
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
      backgroundColor: Theme.of(context).brightness == Brightness.dark
          ? Colors.grey[900]
          : Colors.grey[50],
      body: Column(
        children: [
          // Messages List
          Expanded(
            child: Container(
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.grey[900]
                  : Colors.grey[50],
              child: _messages.isEmpty
                  ? Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
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
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 32),
                              child: Text(
                                'Coba tanyakan: "Saya ingin melaporkan jalan rusak"',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Theme.of(context).brightness == Brightness.dark
                                      ? Colors.grey[400]
                                      : Colors.grey[600],
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: _messages.length + (_isLoading ? 1 : 0),
                      itemBuilder: (context, index) {
                      // Loading indicator
                      if (index == _messages.length) {
                        return Align(
                          alignment: Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12, left: 16, right: 16),
                            constraints: BoxConstraints(
                              maxWidth: MediaQuery.of(context).size.width * 0.75,
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [Colors.blue[500]!, Colors.purple[500]!],
                                    ),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.smart_toy, size: 18, color: Colors.white),
                                ),
                                const SizedBox(width: 12),
                                Flexible(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                    decoration: BoxDecoration(
                                      color: Theme.of(context).brightness == Brightness.dark
                                          ? Colors.grey[800]
                                          : Colors.white,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: Theme.of(context).brightness == Brightness.dark
                                            ? Colors.grey[700]!
                                            : Colors.grey[200]!,
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.5,
                                            valueColor: AlwaysStoppedAnimation<Color>(Colors.blue[600]!),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Flexible(
                                          child: Text(
                                            'AI sedang menganalisis...',
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: Theme.of(context).brightness == Brightness.dark
                                                  ? Colors.grey[300]
                                                  : Colors.grey[700],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }
                      
                      // Get message
                      final message = _messages[index];
                      final isUser = message['role'] == 'user';
                      final DateTime? timestamp = message['timestamp'] as DateTime?;
                      final previousTimestamp = index > 0
                          ? _messages[index - 1]['timestamp'] as DateTime?
                          : null;
                      final bool showDateSeparator =
                          timestamp != null && (previousTimestamp == null || !_isSameDay(timestamp, previousTimestamp));
                      final DateTime? separatorTimestamp = showDateSeparator ? timestamp : null;

                      final bubble = Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: EdgeInsets.only(
                            bottom: 12,
                            left: isUser ? 16 : 0,
                            right: isUser ? 0 : 16,
                          ),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.75,
                          ),
                          child: Row(
                            mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                            crossAxisAlignment: CrossAxisAlignment.end,
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
                                    color: isUser
                                        ? null
                                        : (Theme.of(context).brightness == Brightness.dark
                                            ? Colors.grey[800]
                                            : Colors.white),
                                    borderRadius: BorderRadius.circular(16),
                                    border: isUser
                                        ? null
                                        : Border.all(
                                            color: Theme.of(context).brightness == Brightness.dark
                                                ? Colors.grey[700]!
                                                : Colors.grey[200]!,
                                          ),
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
                                    mainAxisSize: MainAxisSize.min,
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
                                      SelectableText(
                                        _removeMarkdown(message['content']),
                                        style: TextStyle(
                                          color: isUser
                                              ? Colors.white
                                              : (Theme.of(context).brightness == Brightness.dark
                                                  ? Colors.grey[100]
                                                  : Colors.black87),
                                          fontSize: 14,
                                          height: 1.4,
                                        ),
                                      ),
                                      // Tampilkan tombol CTA jika ada reportData (SELALU tampilkan tombol jika ada reportData)
                                      // Periksa reportData di message atau di _pendingReportDraft
                                      if (!isUser && (message['reportData'] != null || _pendingReportDraft != null)) ...[
                                        const SizedBox(height: 12),
                                        Row(
                                          children: [
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                onPressed: () async {
                                                  // Navigasi ke edit screen
                                                  // Gunakan reportData dari message atau _pendingReportDraft
                                                  final draftData = message['reportData'] ?? _pendingReportDraft;
                                                  if (draftData != null) {
                                                    final draft = draftData as Map<String, dynamic>;
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
                                                    
                                                    // Jika report berhasil dibuat dari edit screen
                                                    if (result == true) {
                                                      setState(() {
                                                        _pendingReportDraft = null;
                                                        // Hapus reportData dari message
                                                        final messageIndex = _messages.indexWhere((m) => m == message);
                                                        if (messageIndex != -1) {
                                                          _messages[messageIndex] = Map<String, dynamic>.from(_messages[messageIndex])
                                                            ..remove('reportData')
                                                            ..['awaitingConfirmation'] = false;
                                                        }
                                                      });
                                                      ref.read(reportProvider.notifier).refresh();
                                                    }
                                                  }
                                                },
                                                icon: Icon(
                                                  Icons.edit,
                                                  size: 18,
                                                  color: Theme.of(context).brightness == Brightness.dark
                                                      ? Colors.grey[300]
                                                      : Colors.blue[600],
                                                ),
                                                label: const Text('Edit'),
                                                style: OutlinedButton.styleFrom(
                                                  foregroundColor: Theme.of(context).brightness == Brightness.dark
                                                      ? Colors.grey[300]
                                                      : Colors.blue[600],
                                                  side: BorderSide(
                                                    color: Theme.of(context).brightness == Brightness.dark
                                                        ? Colors.grey[600]!
                                                        : Colors.blue[600]!,
                                                  ),
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: OutlinedButton(
                                                onPressed: () {
                                                  setState(() {
                                                    _pendingReportDraft = null;
                                                    // Hapus reportData dari message
                                                    final messageIndex = _messages.indexWhere((m) => m == message);
                                                    if (messageIndex != -1) {
                                                      _messages[messageIndex] = Map<String, dynamic>.from(_messages[messageIndex])
                                                        ..remove('reportData')
                                                        ..['awaitingConfirmation'] = false;
                                                    }
                                                  });
                                                },
                                                style: OutlinedButton.styleFrom(
                                                  foregroundColor: Theme.of(context).brightness == Brightness.dark
                                                      ? Colors.grey[300]
                                                      : Colors.blue[600],
                                                  side: BorderSide(
                                                    color: Theme.of(context).brightness == Brightness.dark
                                                        ? Colors.grey[600]!
                                                        : Colors.blue[600]!,
                                                  ),
                                                ),
                                                child: const Text('Batal'),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              flex: 2,
                                              child: ElevatedButton.icon(
                                                onPressed: () async {
                                                  // Langsung kirim pesan konfirmasi ke chatbot
                                                  // Gunakan reportData dari message atau _pendingReportDraft
                                                  final draftData = message['reportData'] ?? _pendingReportDraft;
                                                  if (draftData != null) {
                                                    _pendingReportDraft = draftData is Map<String, dynamic> 
                                                        ? Map<String, dynamic>.from(draftData)
                                                        : draftData;
                                                    
                                                    // Kirim pesan konfirmasi
                                                    setState(() {
                                                      _messages.add({
                                                        'role': 'user',
                                                        'content': 'kirim laporan',
                                                        'timestamp': DateTime.now(),
                                                      });
                                                      _isLoading = true;
                                                    });
                                                    
                                                    _scrollToBottom();
                                                    
                                                    try {
                                                      final isNewSession = false;
                                                      Map<String, double>? location;
                                                      try {
                                                        final position = await LocationService().getCurrentLocation();
                                                        if (position != null) {
                                                          location = {
                                                            'latitude': position.latitude,
                                                            'longitude': position.longitude,
                                                          };
                                                        }
                                                      } catch (e) {
                                                        debugPrint('Error getting location: $e');
                                                      }
                                                      
                                                      final response = await ApiService().sendChatMessage(
                                                        'kirim laporan',
                                                        _prepareMessagesForApi(),
                                                        newSession: isNewSession,
                                                        location: location,
                                                      );
                                                      
                                                      setState(() {
                                                        _messages.add({
                                                          'role': 'assistant',
                                                          'content': _removeMarkdown(response.data['response'] ?? response.data['message'] ?? response.data['reply'] ?? 'Laporan berhasil dikirim!'),
                                                          'timestamp': DateTime.now(),
                                                        });
                                                        
                                                        // Jika report sudah dibuat
                                                        if (response.data['reportCreated'] == true) {
                                                          _pendingReportDraft = null;
                                                          ScaffoldMessenger.of(context).showSnackBar(
                                                            const SnackBar(
                                                              content: Text('Laporan berhasil dibuat via chatbot!'),
                                                              backgroundColor: Colors.green,
                                                            ),
                                                          );
                                                          ref.read(reportProvider.notifier).refresh();
                                                        }
                                                        
                                                        _isLoading = false;
                                                      });
                                                      
                                                      _scrollToBottom();
                                                    } catch (e) {
                                                      setState(() {
                                                        _messages.add({
                                                          'role': 'assistant',
                                                          'content': 'Maaf, terjadi kesalahan saat mengirim laporan. Silakan coba lagi.',
                                                          'timestamp': DateTime.now(),
                                                        });
                                                        _isLoading = false;
                                                      });
                                                      _scrollToBottom();
                                                    }
                                                  }
                                                },
                                                icon: const Icon(Icons.send, color: Colors.white, size: 18),
                                                label: const Text('Kirim', style: TextStyle(color: Colors.white)),
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: Colors.blue[600],
                                                  foregroundColor: Colors.white,
                                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                      if (timestamp != null) ...[
                                        const SizedBox(height: 8),
                                        _buildTimestampRow(timestamp, isUser, context),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                              if (isUser) const SizedBox(width: 8),
                              if (isUser)
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).brightness == Brightness.dark
                                        ? Colors.grey[700]
                                        : Colors.grey[300],
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

                      if (separatorTimestamp != null) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _buildDateSeparator(separatorTimestamp, context),
                            bubble,
                          ],
                        );
                      }

                      return bubble;
                    },
                  ),
            ),
          ),

          // Pending Draft Card (fixed at bottom)
          if (_pendingReportDraft != null && _messages.isNotEmpty)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: _buildDraftCard(_pendingReportDraft!),
            ),

          // Quick Suggestions (jika belum ada pesan atau baru mulai, dan tidak sedang loading)
          if (_messages.length <= 1 && !_isLoading)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.grey[900]
                    : Colors.grey[50],
                border: Border(
                  top: BorderSide(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? Colors.grey[800]!
                        : Colors.grey[200]!,
                    width: 1,
                  ),
                ),
              ),
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
                    backgroundColor: Theme.of(context).brightness == Brightness.dark
                        ? Colors.blue[900]!.withOpacity(0.3)
                        : Colors.blue[50],
                    side: BorderSide(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? Colors.blue[700]!.withOpacity(0.5)
                          : Colors.blue[200]!,
                    ),
                    labelStyle: TextStyle(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? Colors.blue[200]
                          : Colors.blue[700],
                      fontSize: 13,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  );
                }).toList(),
              ),
            ),

          // Input Area
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  spreadRadius: 0,
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    IconButton(
                      icon: Icon(Icons.image, color: Colors.blue[600], size: 24),
                      onPressed: _pickImage,
                      padding: const EdgeInsets.all(8),
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        decoration: InputDecoration(
                          hintText: 'Tulis pesan...',
                          hintStyle: TextStyle(
                            color: Theme.of(context).brightness == Brightness.dark
                                ? Colors.grey[500]
                                : Colors.grey[400],
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide(
                              color: Theme.of(context).brightness == Brightness.dark
                                  ? Colors.grey[700]!
                                  : Colors.grey[300]!,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide(
                              color: Theme.of(context).brightness == Brightness.dark
                                  ? Colors.grey[700]!
                                  : Colors.grey[300]!,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide(
                              color: Colors.blue[600]!,
                              width: 2,
                            ),
                          ),
                          filled: true,
                          fillColor: Theme.of(context).brightness == Brightness.dark
                              ? Colors.grey[800]
                              : Colors.grey[50],
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                        style: TextStyle(
                          color: Theme.of(context).brightness == Brightness.dark
                              ? Colors.grey[100]
                              : Colors.black87,
                        ),
                        maxLines: 5,
                        minLines: 1,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.blue[600],
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.send, color: Colors.white, size: 20),
                        onPressed: _isLoading ? null : _sendMessage,
                        padding: const EdgeInsets.all(12),
                        constraints: const BoxConstraints(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDraftCard(Map<String, dynamic> draft) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: isDark
            ? null
            : LinearGradient(
                colors: [Colors.blue[50]!, Colors.indigo[50]!],
              ),
        color: isDark ? Colors.blue[900]!.withOpacity(0.3) : null,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.blue[700]!.withOpacity(0.5) : Colors.blue[300]!,
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.edit_note,
                color: isDark ? Colors.blue[300] : Colors.blue[700],
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                'Draft Laporan',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.grey[100] : Colors.black87,
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
                  backgroundColor: isDark
                      ? Colors.blue[900]!.withOpacity(0.3)
                      : Colors.blue[100],
                  labelStyle: TextStyle(
                    color: isDark ? Colors.blue[200] : Colors.blue[900],
                  ),
                ),
                const SizedBox(width: 8),
                if (draft['urgency'] != null || draft['urgensi'] != null)
                  Chip(
                    label: Text('Urgensi: ${draft['urgency'] ?? draft['urgensi']}'),
                    backgroundColor: isDark
                        ? Colors.orange[900]!.withOpacity(0.3)
                        : Colors.orange[100],
                    labelStyle: TextStyle(
                      color: isDark ? Colors.orange[200] : Colors.orange[900],
                    ),
                  ),
              ],
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    // Navigasi ke edit screen
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
                    
                    // Jika report berhasil dibuat dari edit screen
                    if (result == true) {
                      setState(() {
                        _pendingReportDraft = null;
                      });
                      ref.read(reportProvider.notifier).refresh();
                    }
                  },
                  icon: Icon(
                    Icons.edit,
                    size: 18,
                    color: isDark ? Colors.grey[300] : Colors.blue[600],
                  ),
                  label: const Text('Edit'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: isDark ? Colors.grey[300] : Colors.blue[600],
                    side: BorderSide(
                      color: isDark ? Colors.grey[600]! : Colors.blue[600]!,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    setState(() {
                      _pendingReportDraft = null;
                    });
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: isDark ? Colors.grey[300] : Colors.blue[600],
                    side: BorderSide(
                      color: isDark ? Colors.grey[600]! : Colors.blue[600]!,
                    ),
                  ),
                  child: const Text('Batal'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    // Langsung kirim pesan konfirmasi ke chatbot
                    if (_pendingReportDraft != null) {
                      setState(() {
                        _messages.add({
                          'role': 'user',
                          'content': 'kirim laporan',
                          'timestamp': DateTime.now(),
                        });
                        _isLoading = true;
                      });
                      
                      _scrollToBottom();
                      
                      try {
                        final isNewSession = false;
                        Map<String, double>? location;
                        try {
                          final position = await LocationService().getCurrentLocation();
                          if (position != null) {
                            location = {
                              'latitude': position.latitude,
                              'longitude': position.longitude,
                            };
                          }
                        } catch (e) {
                          debugPrint('Error getting location: $e');
                        }
                        
                        final response = await ApiService().sendChatMessage(
                          'kirim laporan',
                          _prepareMessagesForApi(),
                          newSession: isNewSession,
                          location: location,
                        );
                        
                        setState(() {
                          _messages.add({
                            'role': 'assistant',
                            'content': _removeMarkdown(response.data['response'] ?? response.data['message'] ?? response.data['reply'] ?? 'Laporan berhasil dikirim!'),
                            'timestamp': DateTime.now(),
                          });
                          
                          // Jika report sudah dibuat
                          if (response.data['reportCreated'] == true) {
                            _pendingReportDraft = null;
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Laporan berhasil dibuat via chatbot!'),
                                backgroundColor: Colors.green,
                              ),
                            );
                            ref.read(reportProvider.notifier).refresh();
                          }
                          
                          _isLoading = false;
                        });
                        
                        _scrollToBottom();
                      } catch (e) {
                        setState(() {
                          _messages.add({
                            'role': 'assistant',
                            'content': 'Maaf, terjadi kesalahan saat mengirim laporan. Silakan coba lagi.',
                            'timestamp': DateTime.now(),
                          });
                          _isLoading = false;
                        });
                        _scrollToBottom();
                      }
                    }
                  },
                  icon: const Icon(Icons.send, color: Colors.white, size: 18),
                  label: const Text('Kirim', style: TextStyle(color: Colors.white)),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
              color: isDark ? Colors.grey[300] : Colors.grey[700],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[200] : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimestampRow(DateTime timestamp, bool isUser, BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final Color textColor = isUser
        ? Colors.white.withOpacity(0.85)
        : (isDark ? Colors.grey[400]! : Colors.grey[600]!);

    return Row(
      mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
      children: [
        Icon(
          Icons.schedule_rounded,
          size: 14,
          color: isUser
              ? Colors.white70
              : (isDark ? Colors.grey[500] : Colors.grey[500]),
        ),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            _formatDetailedTimestamp(timestamp),
            style: TextStyle(
              color: textColor,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDateSeparator(DateTime timestamp, BuildContext context) {
    final label = _formatDateHeader(timestamp);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.grey[200]! : Colors.grey[700]!;
    final dividerColor = isDark ? Colors.grey[600]! : Colors.grey[300]!;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Expanded(child: Divider(color: dividerColor)),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Divider(color: dividerColor)),
        ],
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  String _formatDateHeader(DateTime dateTime) {
    if (!_localeInitialized) {
      // Jika locale belum terinisialisasi, gunakan format default
      return DateFormat('EEEE, d MMM yyyy').format(dateTime);
    }
    try {
      return DateFormat('EEEE, d MMM yyyy', 'id_ID').format(dateTime);
    } catch (e) {
      debugPrint('Error formatting date header: $e');
      // Fallback jika locale belum terinisialisasi
      return DateFormat('EEEE, d MMM yyyy').format(dateTime);
    }
  }

  String _formatDetailedTimestamp(DateTime dateTime) {
    if (!_localeInitialized) {
      // Jika locale belum terinisialisasi, gunakan format default
      final datePart = DateFormat('d MMM yyyy').format(dateTime);
      final timePart = DateFormat('HH:mm').format(dateTime);
      return '$datePart • $timePart WIB';
    }
    try {
      final datePart = DateFormat('d MMM yyyy', 'id_ID').format(dateTime);
      final timePart = DateFormat('HH:mm', 'id_ID').format(dateTime);
      return '$datePart • $timePart WIB';
    } catch (e) {
      debugPrint('Error formatting timestamp: $e');
      // Fallback jika locale belum terinisialisasi
      final datePart = DateFormat('d MMM yyyy').format(dateTime);
      final timePart = DateFormat('HH:mm').format(dateTime);
      return '$datePart • $timePart WIB';
    }
  }
}
