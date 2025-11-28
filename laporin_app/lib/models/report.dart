class Report {
  final int id;
  final int userId;
  final String title;
  final String description;
  final String location;
  final String category;
  final String urgency;
  final String status;
  final String? aiSummary;
  final String? blockchainTxHash;
  final String? imageUrl;
  final double? latitude;
  final double? longitude;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? userName;
  final String? userEmail;
  final String? rtRw;
  final bool isSensitive; // Laporan sensitif/rahasia

  Report({
    required this.id,
    required this.userId,
    required this.title,
    required this.description,
    required this.location,
    required this.category,
    required this.urgency,
    required this.status,
    this.aiSummary,
    this.blockchainTxHash,
    this.imageUrl,
    this.latitude,
    this.longitude,
    required this.createdAt,
    required this.updatedAt,
    this.userName,
    this.userEmail,
    this.rtRw,
    this.isSensitive = false,
  });

  factory Report.fromJson(Map<String, dynamic> json) {
    return Report(
      id: json['id'] ?? 0,
      userId: json['user_id'] ?? json['userId'] ?? 0,
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      location: json['location'] ?? '',
      category: json['category'] ?? '',
      urgency: json['urgency'] ?? '',
      status: json['status'] ?? 'pending',
      aiSummary: json['ai_summary'] ?? json['aiSummary'],
      blockchainTxHash: json['blockchain_tx_hash'] ?? json['blockchainTxHash'],
      imageUrl: json['image_url'] ?? json['imageUrl'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : DateTime.now(),
      userName: json['user_name'] ?? json['userName'],
      userEmail: json['user_email'] ?? json['userEmail'],
      rtRw: json['rt_rw'] ?? json['rtRw'],
      isSensitive: json['is_sensitive'] ?? json['isSensitive'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'location': location,
      'category': category,
      'urgency': urgency,
      'imageUrl': imageUrl,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}

