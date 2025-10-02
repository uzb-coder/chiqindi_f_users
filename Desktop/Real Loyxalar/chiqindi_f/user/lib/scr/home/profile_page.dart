import 'package:user/lib/library.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  // Controllers
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _oldPasswordController;
  late final TextEditingController _newPasswordController;

  // State variables
  bool _isOldPasswordVisible = false;
  bool _isNewPasswordVisible = false;
  String _userName = '';
  String _userPhone = '';
  String _userRole = '';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Initialize controllers
    _nameController = TextEditingController();
    _phoneController = TextEditingController();
    _oldPasswordController = TextEditingController();
    _newPasswordController = TextEditingController();
    // Load user data
    _loadUserData();
  }

  @override
  void dispose() {
    // Clean up controllers
    _nameController.dispose();
    _phoneController.dispose();
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  /// Loads user data from SharedPreferences or LoginService
  Future<void> _loadUserData() async {
    try {
      setState(() => _isLoading = true);
      final prefs = await SharedPreferences.getInstance();
      final loginData = await LoginService.getSavedUsers();

      setState(() {
        _userName = loginData?.user.name ?? prefs.getString('userName') ?? '';
        _userPhone =
            loginData?.user.phone ?? prefs.getString('userPhone') ?? '';
        _userRole = loginData?.user.role ?? prefs.getString('userRole') ?? '';
        _nameController.text = _userName;
        _phoneController.text = _userPhone;
        _isLoading = false;
      });
    } catch (e) {
      _showErrorSnackBar('Failed to load user data: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Saves user data to SharedPreferences
  Future<void> _saveUserData() async {
    try {
      setState(() => _isLoading = true);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('userName', _nameController.text.trim());
      await prefs.setString('userPhone', _phoneController.text.trim());
      // Optionally update role if it’s editable
      // await prefs.setString('userRole', _userRole);

      _showSuccessSnackBar('Profile updated successfully');
    } catch (e) {
      _showErrorSnackBar('Failed to save user data: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Deletes user profile
  Future<void> _deleteProfile() async {
    try {
      setState(() => _isLoading = true);
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear(); // Clears all SharedPreferences data
      _showSuccessSnackBar('Profile deleted successfully');
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      _showErrorSnackBar('Failed to delete profile: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Shows error SnackBar
  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  /// Shows success SnackBar
  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Profile',
          style: const TextStyle(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: Colors.white,
        centerTitle: true,
        elevation: 0.5,
      ),
      body:
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 25,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const CircleAvatar(
                      radius: 50,
                      backgroundColor: Color(0xFFEFEFEF),
                      child: Icon(
                        Icons.person,
                        size: 60,
                        color: Color(0xFFCCCCCC),
                      ),
                    ),
                    const SizedBox(height: 30),
                    _buildInfoFields(),
                    const SizedBox(height: 30),
                    _buildDeleteButton(),
                  ],
                ),
              ),
      bottomNavigationBar: _buildSaveChangesButton(),
    );
  }

  Widget _buildInfoFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Ism', style: TextStyle(color: Colors.grey, fontSize: 14)),
        const SizedBox(height: 8),
        CustomTextField(controller: _nameController),
        const SizedBox(height: 20),
        const Text(
          'Telefon nomer',
          style: TextStyle(color: Colors.grey, fontSize: 14),
        ),
        const SizedBox(height: 8),
        CustomTextField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
        ),
      ],
    );
  }

  Widget _buildDeleteButton() {
    return TextButton.icon(
      onPressed: _deleteProfile,
      icon: const Icon(Icons.delete_outline, color: Colors.red),
      label: const Text(
        'Profilni o\'chirish',
        style: TextStyle(color: Colors.red, fontSize: 16),
      ),
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Widget _buildSaveChangesButton() {
    return Container(
      padding: const EdgeInsets.all(20),
      color: const Color(0xFFF8F8F8),
      child: ElevatedButton(
        onPressed: _isLoading ? null : _saveUserData,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFFFCA28),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
          elevation: 0,
        ),
        child: const Text(
          'O\'zgarishlarni saqlang',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

class CustomTextField extends StatelessWidget {
  final TextEditingController controller;
  final String? hintText;
  final IconData? prefixIcon;
  final bool isPassword;
  final bool isPasswordVisible;
  final VoidCallback? onVisibilityToggle;
  final TextInputType? keyboardType;

  const CustomTextField({
    super.key,
    required this.controller,
    this.hintText,
    this.prefixIcon,
    this.isPassword = false,
    this.isPasswordVisible = false,
    this.onVisibilityToggle,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    final outlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: Color(0xFFE0E0E0), width: 1.5),
    );

    final focusedOutlineInputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: Color(0xFFFFCA28), width: 2),
    );

    return TextFormField(
      controller: controller,
      obscureText: isPassword && !isPasswordVisible,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: const TextStyle(color: Colors.grey),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          vertical: 18,
          horizontal: 20,
        ),
        prefixIcon:
            prefixIcon != null ? Icon(prefixIcon, color: Colors.grey) : null,
        suffixIcon:
            isPassword
                ? IconButton(
                  icon: Icon(
                    isPasswordVisible
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    color: Colors.grey,
                  ),
                  onPressed: onVisibilityToggle,
                )
                : null,
        border: outlineInputBorder,
        enabledBorder: outlineInputBorder,
        focusedBorder: focusedOutlineInputBorder,
      ),
    );
  }
}
