class User {
  final int id;
  final String name;
  final String email;
  final String role;
  final String? rtRw;
  final String? gender;
  final String? jenisKelamin;
  final bool isVerified;
  final bool hasFaceRegistered;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.rtRw,
    this.gender,
    this.jenisKelamin,
    required this.isVerified,
    required this.hasFaceRegistered,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? json['userId'] ?? 0,
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'warga',
      rtRw: json['rtRw'] ?? json['rt_rw'],
      gender: json['gender'],
      jenisKelamin: json['jenisKelamin'] ?? json['jenis_kelamin'],
      isVerified: json['isVerified'] ?? json['is_verified'] ?? false,
      hasFaceRegistered: json['hasFaceRegistered'] ?? json['has_face_registered'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'rtRw': rtRw,
      'gender': gender,
      'jenisKelamin': jenisKelamin,
      'isVerified': isVerified,
      'hasFaceRegistered': hasFaceRegistered,
    };
  }

  User copyWith({
    int? id,
    String? name,
    String? email,
    String? role,
    String? rtRw,
    String? gender,
    String? jenisKelamin,
    bool? isVerified,
    bool? hasFaceRegistered,
  }) {
    return User(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      rtRw: rtRw ?? this.rtRw,
      gender: gender ?? this.gender,
      jenisKelamin: jenisKelamin ?? this.jenisKelamin,
      isVerified: isVerified ?? this.isVerified,
      hasFaceRegistered: hasFaceRegistered ?? this.hasFaceRegistered,
    );
  }
}

