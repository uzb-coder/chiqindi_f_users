import 'package:user/lib/library.dart';

class LoginResponse {
  final String message;
  final String token;
  final UserModel user;

  LoginResponse({
    required this.message,
    required this.token,
    required this.user,
  });

  factory LoginResponse.fromMap(Map<String, dynamic> map) {
    return LoginResponse(
      message: map['message']?.toString() ?? '',
      token: map['token']?.toString() ?? '',
      user: UserModel.fromMap(map['user'] as Map<String, dynamic>),
    );
  }

  Map<String, dynamic> toMap() {
    return {'message': message, 'token': token, 'user': user.toMap()};
  }

  factory LoginResponse.fromJson(String source) =>
      LoginResponse.fromMap(jsonDecode(source));

  String toJson() => jsonEncode(toMap());
}

class UserModel {
  final String id;
  final String name;
  final String phone;
  final String role;

  UserModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
  });

  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      id: map['_id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      phone: map['phone']?.toString() ?? '',
      role: map['role']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {'id': id, 'name': name, 'phone': phone, 'role': role};
  }
}
