import 'package:user/lib/library.dart';

class MyOrdersPage extends StatefulWidget {
  @override
  _MyOrdersPageState createState() => _MyOrdersPageState();
}

class _MyOrdersPageState extends State<MyOrdersPage> {
  Future<List<Order>>? myOrders;
  final orderService = OrderService();

  @override
  void initState() {
    super.initState();
    myOrders = orderService.getOrders();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2, // ikkita bo‘lim
      child: Scaffold(
        appBar: AppBar(
          title: Text("Mening buyurtmalarim"),
          bottom: TabBar(
            tabs: [
              Tab(text: "Yo‘lda / Qabul qilingan"),
              Tab(text: "Yetkazilgan"),
            ],
          ),
        ),
        body: FutureBuilder<List<Order>>(
          future: myOrders,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return Center(child: CircularProgressIndicator());
            } else if (snapshot.hasError) {
              return Center(child: Text("Xatolik: ${snapshot.error}"));
            } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
              return Center(child: Text("Buyurtmalar mavjud emas"));
            } else {
              // Buyurtmalarni status bo‘yicha ajratamiz
              final assignedOrders =
                  snapshot.data!.where((o) => o.status != "completed").toList();
              final completedOrders =
                  snapshot.data!.where((o) => o.status == "completed").toList();

              return TabBarView(
                children: [
                  // 1-Tab: Yo‘lda / Qabul qilingan
                  ListView(
                    children:
                        assignedOrders
                            .map((order) => buildOrderCard(order))
                            .toList(),
                  ),
                  // 2-Tab: Yetkazilgan
                  ListView(
                    children:
                        completedOrders
                            .map((order) => buildOrderCard(order))
                            .toList(),
                  ),
                ],
              );
            }
          },
        ),
      ),
    );
  }

  Widget buildOrderCard(Order order) {
    // Status matn va rangi
    String statusText;
    Color statusColor;

    if (order.status == "assigned") {
      statusText = "Qabul qilindi / Yo‘lda";
      statusColor = Colors.orange;
    } else if (order.status == "completed") {
      statusText = "Yetkazildi";
      statusColor = Colors.green;
    } else if (order.status == "new") {
      statusText = "Yangi";
      statusColor = Colors.blue;
    } else {
      statusText = order.status;
      statusColor = Colors.black;
    }

    return Card(
      margin: EdgeInsets.all(10),
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Status: $statusText",
              style: TextStyle(fontWeight: FontWeight.bold, color: statusColor),
            ),
            SizedBox(height: 8),
            Text(
              "${order.city}, ${order.street}, ${order.house}",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text("Sumkalar soni: ${order.bagsCount}"),
            Text("Jami narx: ${order.price}"),
            if (order.promoCode != null) Text("Promo code: ${order.promoCode}"),
            if (order.comment != null) Text("Izoh: ${order.comment}"),
            SizedBox(height: 8),
            Text("Sana: ${order.date}"),
            Text("Vaqt: ${order.time}"),
          ],
        ),
      ),
    );
  }
}
