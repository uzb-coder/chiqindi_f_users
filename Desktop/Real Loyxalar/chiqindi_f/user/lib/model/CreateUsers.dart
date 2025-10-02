class Createusers {
  final String id;
  final String name;
  final String phone;
  final String role;

  Createusers({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
  });

  // JSON dan modelga
  factory Createusers.fromJson(Map<String, dynamic> json) {
    return Createusers(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'user',
    );
  }

  // Modelni JSON ga
  Map<String, dynamic> toJson() {
    return {
      "name": name,
      "phone": phone,
      "role": role,
    };
  }
}
