import 'package:user/lib/library.dart';

class OrderService {
  final Dio _dio = Dio(
      BaseOptions(
        baseUrl: Api.baseUrl, // backend URL
        headers: {'Content-Type': 'application/json'},
      ),
    )
    ..interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) => handler.next(options),
        onResponse: (response, handler) => handler.next(response),
        onError: (DioError e, handler) => handler.next(e),
      ),
    );

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  // 🔹 Buyurtmalarni olish
  Future<List<Order>> getOrders() async {
    final token = await _getToken();
    if (token == null) throw Exception('Token topilmadi');

    final response = await _dio.get(
      '/orders/my',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );

    List data = response.data;
    return data.map((e) => Order.fromJson(e)).toList();
  }

  // 🔹 Yangi buyurtma yaratish
  Future<Order> createOrder({
    required String city,
    required String street,
    required String house,
    String? block,
    String? entrance,
    String? floor,
    String? apartment,
    required bool isPrivateHouse,
    required String date,
    required String time,
    required int bagsCount,
    String? promoCode,
    String? comment,
    required double latitude,
    required double longitude,
  }) async {
    final token = await _getToken();
    if (token == null) throw Exception("Token topilmadi!");

    final response = await _dio.post(
      '/orders/create',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
      data: {
        'city': city,
        'street': street,
        'house': house,
        'block': block,
        'entrance': entrance,
        'floor': floor,
        'apartment': apartment,
        'isPrivateHouse': isPrivateHouse,
        'date': date,
        'time': time,
        'bagsCount': bagsCount,
        'promoCode': promoCode,
        'comment': comment,
        'latitude': latitude,
        'longitude': longitude,
      },
    );

    return Order.fromJson(response.data['order']);
  }
}
