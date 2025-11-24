class User {
  final int id;
  final String name;
  final String email;
  final String role;
  final String? rtRw;
  final String? gender;
  final bool isVerified;
  final bool hasFaceRegistered;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.rtRw,
    this.gender,
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
      'isVerified': isVerified,
      'hasFaceRegistered': hasFaceRegistered,
    };
  }
}

