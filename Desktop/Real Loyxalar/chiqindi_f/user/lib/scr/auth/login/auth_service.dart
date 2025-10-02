import 'package:user/lib/library.dart';
import 'package:user/model/CreateUsers.dart';

class LoginService {
  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: Api.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ),
  );

  // Login qilish
  static Future<LoginResponse?> loginUser(String phone, String password) async {
    try {
      final response = await _dio.post(
        "${Api.baseUrl}/auth/login",
        data: {"phone": phone, "password": password},
      );
      if (response.statusCode == 200 && response.data['token'] != null) {
        LoginResponse parents = LoginResponse.fromMap(response.data);
        await _saveToken(parents.token);
        await _saveParents(parents);

        return parents;
      }

      if (response.statusCode == 401) {
        print('Login xato: 401 Unauthorized');
        return null;
      }
      return null;
    } catch (e) {
      print("Login xatosi: $e");
      return null;
    }
  }

  Future<Createusers> signup(String name, String phone, String password) async {
    try {
      final response = await _dio.post(
        "${Api.baseUrl}/auth/signup",
        data: {"name": name, "phone": phone, "password": password},
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;

        if (data['user'] != null) {
          return Createusers.fromJson(data['user']);
        }
        return Createusers.fromJson(data);
      } else {
        throw Exception(response.data['message'] ?? "Xatolik yuz berdi");
      }
    } on DioException catch (e) {
      throw Exception(
        e.response?.data['message'] ?? e.message ?? "Server xatosi",
      );
    }
  }

  // Authorized POST
  static Future<Response?> post(
    String path, {
    Map<String, dynamic>? data,
  }) async {
    try {
      final token = await getToken();
      return await _dio.post(
        path,
        data: data,
        options: Options(headers: {"Authorization": "Bearer $token"}),
      );
    } catch (e) {
      print("POST xatosi: $e");
      return null;
    }
  }

  // Token saqlash
  static Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
    print(prefs);
  }

  // Token olish
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  // Tokenni tozalash
  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('parents_data'); // Parents ma'lumotini ham tozalaymiz
  }

  // Login qilinganmi?
  static Future<bool> isLoggedIn() async {
    return (await getToken()) != null;
  }

  static Future<void> _saveParents(LoginResponse parents) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('parents_data', jsonEncode(parents.toJson()));
  }

  static Future<LoginResponse?> getSavedUsers() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('parents_data');
    if (data != null) {
      return LoginResponse.fromJson(jsonDecode(data));
    }
    return null;
  }

  // Logout qilish
  static Future<void> logout() async {
    await clearToken();
  }
}
