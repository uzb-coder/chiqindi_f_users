class Order {
  final String id; // MongoDB _id
  final String userId;
  final String city;
  final String street;
  final String house;
  final String? block;
  final String? entrance;
  final String? floor;
  final String? apartment;
  final bool isPrivateHouse;
  final String date;
  final String time;
  final int bagsCount;
  final String? promoCode;
  final String? comment;
  final int price;
  final int pricePerBag;
  final Location location;
  final String status;

  Order({
    required this.id,
    required this.status,
    required this.userId,
    required this.city,
    required this.street,
    required this.house,
    this.block,
    this.entrance,
    this.floor,
    this.apartment,
    required this.isPrivateHouse,
    required this.date,
    required this.time,
    required this.bagsCount,
    this.promoCode,
    this.comment,
    required this.price,
    required this.pricePerBag,
    required this.location,
  });

  // JSON’dan Dart objectga o‘tkazish
  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['_id'] ?? '',
      userId: json['userId'] ?? '',
      status: json['status'] ?? '',
      city: json['city'] ?? '',
      street: json['street'] ?? '',
      house: json['house'] ?? '',
      block: json['block'],
      entrance: json['entrance'],
      floor: json['floor'],
      apartment: json['apartment'],
      isPrivateHouse: json['isPrivateHouse'] ?? false,
      date: json['date'] ?? '',
      time: json['time'] ?? '',
      bagsCount: json['bagsCount'] ?? 0,
      promoCode: json['promoCode'],
      comment: json['comment'],
      price: json['price'] ?? 0,
      pricePerBag: json['pricePerBag'] ?? 0,
      location: Location.fromJson(json['location']),
    );
  }

  // Dart objectni JSON formatga o‘tkazish
  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'userId': userId,
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
      'price': price,
      'pricePerBag': pricePerBag,
      'location': location.toJson(),
    };
  }
}

class Location {
  final String type;
  final List<double> coordinates; // [longitude, latitude]

  Location({required this.type, required this.coordinates});

  factory Location.fromJson(Map<String, dynamic> json) {
    List<dynamic> coords = json['coordinates'] ?? [0.0, 0.0];
    return Location(
      type: json['type'] ?? 'Point',
      coordinates: coords.map((e) => (e as num).toDouble()).toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {'type': type, 'coordinates': coordinates};
  }
}
