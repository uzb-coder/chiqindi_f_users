import 'package:user/lib/library.dart';

class HomePage extends StatefulWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String userName = '';
  String userPhone = '';
  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final loginData = await LoginService.getSavedUsers();
    if (loginData != null) {
      setState(() {
        userName = loginData.user.name;
        userPhone = loginData.user.phone;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Orqa fon rangini rasmga moslashtiramiz
      backgroundColor: const Color(0xFFF8F8F8),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            children: [
              // 1. Tepadagi profil ma'lumotlari qismi
              _buildHeader(context, userName, userPhone),
              const SizedBox(height: 30),

              // 2. Asosiy menyu tugmalari
              _buildActionGrid(context),
              const SizedBox(height: 40),

              // 3. Pastdagi logotip
              _buildLogo(),
            ],
          ),
        ),
      ),
    );
  }

  // Tepadagi profil qismi uchun alohida metod
  Widget _buildHeader(BuildContext context, String userName, String userPhone) {
    return Row(
      children: [
        const CircleAvatar(
          radius: 30,
          backgroundColor: Color(0xFFE0E0E0),
          child: Icon(Icons.person_outline, size: 35, color: Color(0xFFB0B0B0)),
        ),
        const SizedBox(width: 15),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              userName,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 4),
            Text(userPhone, style: TextStyle(fontSize: 14, color: Colors.grey)),
          ],
        ),
        const Spacer(), // O'rtada bo'sh joy qoldirish uchun
        IconButton(
          onPressed: () {},
          icon: const Icon(
            Icons.notifications_none_outlined,
            color: Colors.grey,
            size: 28,
          ),
        ),
        IconButton(
          onPressed: () {
            Navigator.pushNamed(context, '/profile');
          },
          icon: const Icon(
            Icons.settings_outlined,
            color: Colors.grey,
            size: 28,
          ),
        ),
      ],
    );
  }

  // Menyular to'plami uchun alohida metod
  Widget _buildActionGrid(BuildContext context) {
    return Wrap(
      spacing: 15, // gorizontal oraliq
      runSpacing: 15, // vertikal oraliq
      children: [
        SizedBox(
          width:
              MediaQuery.of(context).size.width / 2 -
              30, // 2 tadan chiqishi uchun
          child: GestureDetector(
            onTap: () {
              Navigator.pushNamed(context, '/createorder');
            },
            child: _CreateOrderCard(),
          ),
        ),
        SizedBox(
          width: MediaQuery.of(context).size.width / 2 - 30,
          child: GestureDetector(
            onTap: () {
              Navigator.pushNamed(context, '/myorders');
            },
            child: _InfoCard(
              icon: Icons.list_alt_outlined,
              title: 'Mening buyurtmalarim',
              subtitle: '0 buyurtma',
              iconColor: Colors.orange,
            ),
          ),
        ),
        SizedBox(
          width: MediaQuery.of(context).size.width / 2 - 30,
          child: GestureDetector(
            onTap: () {
              // Navigator.pushNamed(context, '/about_app');
            },
            child: _InfoCard(
              icon: Icons.info_outline,
              title: 'Ilova haqida',
              subtitle: 'Batafsil',
              iconColor: Colors.green,
            ),
          ),
        ),
        SizedBox(
          width: MediaQuery.of(context).size.width / 2 - 30,
          child: GestureDetector(
            onTap: () {
              // Navigator.pushNamed(context, '/logout');
            },
            child: _InfoCard(
              icon: Icons.exit_to_app_outlined,
              title: 'Chiqish',
              subtitle: 'Profildan',
              backgroundColor: const Color(0xFFE57373),
              textColor: Colors.white,
              iconColor: Colors.white,
            ),
          ),
        ),
      ],
    );
  }

  // Pastki logotip uchun alohida metod
  Widget _buildLogo() {
    // Agar assets papkasida rasm bo'lsa `Image.asset` ishlatiladi
    // Aks holda `Icon` ishlatamiz
    return Column(
      children: [
        Image.asset(
          'assets/logo.png', // pubspec.yaml da ko'rsatilgan yo'l
          height: 60,
          errorBuilder: (context, error, stackTrace) {
            // Agar rasm topilmasa, o'rniga boshqa narsa ko'rsatish
            return const Icon(Icons.recycling, size: 60, color: Colors.grey);
          },
        ),
        const SizedBox(height: 8),
        const Text(
          'CHIQINDI CHIQARISH XIZMATI',
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }
}

// Qayta ishlatiladigan kichik oq/qizil kartochkalar uchun vidjet
class _InfoCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color? backgroundColor;
  final Color? textColor;
  final Color? iconColor;

  const _InfoCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.backgroundColor = Colors.white,
    this.textColor = Colors.black87,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 2,
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 28, color: iconColor ?? textColor),
          const SizedBox(height: 12),
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(fontSize: 13, color: textColor?.withOpacity(0.7)),
          ),
        ],
      ),
    );
  }
}

// "Buyurtma yaratish" sariq kartochkasi uchun alohida vidjet
class _CreateOrderCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 170, // Boshqa kartochkalarga mos balandlik
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: const Color(0xFFFFCA28), // Sariq rang
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.15),
            spreadRadius: 2,
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.add, color: Colors.black, size: 24),
          ),
          const Spacer(),
          const Text(
            'Buyurtma',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const Text(
            'yaratish',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
