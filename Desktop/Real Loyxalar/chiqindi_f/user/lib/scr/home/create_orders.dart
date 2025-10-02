import 'package:user/lib/library.dart';

class CreateOrderPage extends StatefulWidget {
  const CreateOrderPage({super.key});

  @override
  _CreateOrderPageState createState() => _CreateOrderPageState();
}

class _CreateOrderPageState extends State<CreateOrderPage> {
  final _formKey = GlobalKey<FormState>();

  final cityController = TextEditingController();
  final streetController = TextEditingController();
  final houseController = TextEditingController();
  final blockController = TextEditingController();
  final entranceController = TextEditingController();
  final floorController = TextEditingController();
  final apartmentController = TextEditingController();
  final promoCodeController = TextEditingController();
  final commentController = TextEditingController();
  bool isPrivateHouse = false;

  final orderService = OrderService();

  double latitude = 41.3111;
  double longitude = 69.2797;
  int bagsCount = 1;

  // Shaharlar ro'yxati
  final List<String> cities = [
    'Toshkent',
    'Samarqand',
    'Buxoro',
    'Andijon',
    'Farg‘ona',
    'Namangan',
    'Qarshi',
    'Nukus',
    'Urganch',
    'Jizzax',
  ];
  String? selectedCity;

  void createOrder() async {
    final now = DateTime.now();

    if (_formKey.currentState!.validate()) {
      try {
        final newOrder = await orderService.createOrder(
          city: cityController.text,
          street: streetController.text,
          house: houseController.text,
          block: blockController.text.isEmpty ? null : blockController.text,
          entrance:
              entranceController.text.isEmpty ? null : entranceController.text,
          floor: floorController.text.isEmpty ? null : floorController.text,
          apartment:
              apartmentController.text.isEmpty
                  ? null
                  : apartmentController.text,
          isPrivateHouse: isPrivateHouse,
          date: now.toIso8601String().split("T")[0],
          time:
              "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}",
          bagsCount: bagsCount,
          promoCode:
              promoCodeController.text.isEmpty
                  ? null
                  : promoCodeController.text,
          comment:
              commentController.text.isEmpty ? null : commentController.text,
          latitude: latitude,
          longitude: longitude,
        );

        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text("Buyurtma yaratildi!")));
        _formKey.currentState!.reset();
        setState(() {
          selectedCity = null;
          bagsCount = 1;
        });
      } catch (e) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text("Xatolik: $e")));
      }
      Navigator.pushNamed(context, AppRoutes.home);
    }
  }

  Future<void> _getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      await Geolocator.openLocationSettings();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Joylashuv xizmati o‘chiq")));
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Joylashuvga ruxsat berilmadi")),
        );
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      await Geolocator.openAppSettings();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Joylashuv ruxsati butunlay rad etilgan")),
      );
      return;
    }

    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        latitude = position.latitude;
        longitude = position.longitude;
      });

      // ✅ Muvaffaqiyatli olinganda xabar
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Joylashuv olindi")));
    } catch (e) {
      // ❌ Olinmasa xabar
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Joylashuv olinmadi")));
    }
  }

  // Sumka sonini oshirish yoki kamaytirish
  void _updateBagCount(bool increment) {
    setState(() {
      if (increment) {
        bagsCount++;
      } else {
        if (bagsCount > 1) bagsCount--;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Buyurtma yaratish"),
        backgroundColor: Theme.of(context).primaryColor,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              // 2x2 GridView for inputs
              GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 2.5, // Input maydonlari balandligini sozlash
                children: [
                  DropdownButtonFormField<String>(
                    decoration: InputDecoration(
                      labelText: 'Shahar',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      filled: true,
                      fillColor: Colors.grey[100],
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                    ),
                    value: selectedCity,
                    items:
                        cities.map((String city) {
                          return DropdownMenuItem<String>(
                            value: city,
                            child: Text(city),
                          );
                        }).toList(),
                    onChanged: (String? newValue) {
                      setState(() {
                        selectedCity = newValue;
                        cityController.text = newValue ?? '';
                      });
                    },
                    validator:
                        (value) => value == null ? 'Shahar tanlang' : null,
                  ),
                  _buildTextField(
                    streetController,
                    "Ko‘cha",
                    validator: (val) => val!.isEmpty ? "Ko‘cha kiriting" : null,
                  ),
                  _buildTextField(
                    houseController,
                    "Uy raqami",
                    validator:
                        (val) => val!.isEmpty ? "Uy raqamini kiriting" : null,
                  ),
                  _buildTextField(blockController, "Mahalla (ixtiyoriy)"),
                  _buildTextField(entranceController, "M'jal (ixtiyoriy)"),
                  _buildTextField(floorController, "Qavat (ixtiyoriy)"),
                  _buildTextField(apartmentController, "Kvartira (ixtiyoriy)"),
                  Container(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Center(
                          child: Text(
                            "Sumka soni",
                            style: TextStyle(color: Colors.black, fontSize: 14),
                          ),
                        ),
                        const SizedBox(height: 10),

                        // FittedBox qo‘shildi
                        Center(
                          child: FittedBox(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                InkWell(
                                  onTap: () => _updateBagCount(false),
                                  borderRadius: BorderRadius.circular(30),
                                  child: CircleAvatar(
                                    radius: 16,
                                    backgroundColor: Colors.red[300],
                                    child: const Icon(
                                      Icons.remove,
                                      color: Colors.white,
                                      size: 18,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 20),
                                Text(
                                  bagsCount.toString(),
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 20),
                                InkWell(
                                  onTap: () => _updateBagCount(true),
                                  borderRadius: BorderRadius.circular(30),
                                  child: CircleAvatar(
                                    radius: 16,
                                    backgroundColor: Colors.green[400],
                                    child: const Icon(
                                      Icons.add,
                                      color: Colors.white,
                                      size: 18,
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
                ],
              ),
              const SizedBox(height: 25),
              _buildTextField(promoCodeController, "Promo code (ixtiyoriy)"),
              const SizedBox(height: 16),
              _buildTextField(
                commentController,
                "Izoh (ixtiyoriy)",
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                title: const Text("Shaxsiy uy"),
                value: isPrivateHouse,
                onChanged: (val) => setState(() => isPrivateHouse = val),
                activeColor: Theme.of(context).primaryColor,
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _getCurrentLocation,
                icon: const Icon(Icons.location_on),
                label: const Text("Joylashuvni yuborish"),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    vertical: 12,
                    horizontal: 20,
                  ),
                  backgroundColor: Theme.of(context).primaryColor,
                  foregroundColor: Colors.white,
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: createOrder,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Theme.of(context).primaryColor,
                  foregroundColor: Colors.white,
                  textStyle: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                child: const Text("Buyurtma yuborish"),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label, {
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        filled: true,
        fillColor: Colors.grey[100],
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 10,
        ),
      ),
      keyboardType: keyboardType,
      validator: validator,
      maxLines: maxLines,
    );
  }

  @override
  void dispose() {
    cityController.dispose();
    streetController.dispose();
    houseController.dispose();
    blockController.dispose();
    entranceController.dispose();
    floorController.dispose();
    apartmentController.dispose();
    promoCodeController.dispose();
    commentController.dispose();
    super.dispose();
  }
}
