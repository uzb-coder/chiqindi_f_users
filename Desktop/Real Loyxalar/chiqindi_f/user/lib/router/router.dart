import 'package:user/lib/library.dart';
import 'package:user/scr/auth/sinup/signup_page.dart';
import 'package:user/scr/home/create_orders.dart';
import 'package:user/scr/home/service/myorders_page.dart';

class AppRoutes {
  static const String login = '/login';
  static const String home = '/home';
  static const String splash = '/splash';
  static const String profile = '/profile';
  static const String createorder = '/createorder';
  static const String myorders = '/myorders';
  static const String signup = '/signup';
}

class AppRouter {
  static final Map<String, WidgetBuilder> routes = {
    AppRoutes.login: (context) => LoginPage(),
    AppRoutes.home: (context) => HomePage(),
    AppRoutes.splash: (context) => SplashPage(),
    AppRoutes.profile: (context) => EditProfileScreen(),
    AppRoutes.createorder: (context) => CreateOrderPage(),
    AppRoutes.myorders: (context) => MyOrdersPage(),
    AppRoutes.signup: (context) => SignupPage(),
  };
}
