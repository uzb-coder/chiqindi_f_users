import 'package:user/lib/library.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {

  Future<void> _checkLoginStatus() async {
   
    //LoginService.clearToken();
    await Future.delayed(const Duration(seconds: 2));

    bool isLoggedIn = await LoginService.isLoggedIn();

    if (!mounted) return;

    if (isLoggedIn) {
      Navigator.pushReplacementNamed(
        context,
        '/home',
      ); // ✅ Agar token bo‘lsa Home sahifaga
    } else {
      Navigator.pushReplacementNamed(
        context,
        '/login',
      ); // ❌ Token bo‘lmasa Login sahifaga
    }
  }

  @override
  void initState() {
    _checkLoginStatus();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          Spacer(),
          Spacer(),
          Center(child: Icon(Icons.local_shipping, size: width * 0.3, color: Colors.black)),
          Spacer(),
          CircularProgressIndicator(color: Colors.black),
          Spacer(),
        ],
      ),
    );
  }
}
