import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(DeliveryDriverApp());
}

class DeliveryDriverApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Delivery Driver',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: RouteScreen(),
    );
  }
}

class RouteScreen extends StatefulWidget {
  @override
  _RouteScreenState createState() => _RouteScreenState();
}

class _RouteScreenState extends State<RouteScreen> {
  List<Delivery> deliveries = [];
  String driverName = "Driver";
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    _setupFirebaseMessaging();
    _loadSavedRoute();
  }

  void _setupFirebaseMessaging() async {
    FirebaseMessaging messaging = FirebaseMessaging.instance;
    
    // Request permission for notifications
    NotificationSettings settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      provisional: false,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted permission');
    }

    // Get FCM token (this will be used to send notifications to this device)
    String? token = await messaging.getToken();
    print("FCM Token: $token");

    // Listen for foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Received message: ${message.data}');
      if (message.data.containsKey('route_data')) {
        _handleNewRoute(message.data['route_data']);
      }
    });

    // Listen for background messages
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('Message opened app: ${message.data}');
      if (message.data.containsKey('route_data')) {
        _handleNewRoute(message.data['route_data']);
      }
    });
  }

  void _handleNewRoute(String routeDataJson) {
    try {
      final routeData = json.decode(routeDataJson);
      setState(() {
        driverName = routeData['driverName'] ?? 'Driver';
        deliveries = (routeData['deliveries'] as List)
            .map((d) => Delivery.fromJson(d))
            .toList();
      });
      _saveRoute(routeDataJson);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('New route received!')),
      );
    } catch (e) {
      print('Error parsing route data: $e');
    }
  }

  void _saveRoute(String routeData) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('current_route', routeData);
  }

  void _loadSavedRoute() async {
    final prefs = await SharedPreferences.getInstance();
    final savedRoute = prefs.getString('current_route');
    if (savedRoute != null) {
      _handleNewRoute(savedRoute);
    }
  }

  void _openGoogleMaps() async {
    if (deliveries.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No deliveries to navigate to')),
      );
      return;
    }

    setState(() {
      isLoading = true;
    });

    try {
      // Create waypoints string for Google Maps
      List<String> waypoints = deliveries.map((d) => '${d.lat},${d.lng}').toList();
      
      // Google Maps URL with waypoints
      String googleMapsUrl = 'https://www.google.com/maps/dir/?api=1&waypoints=${waypoints.join('|')}&travelmode=driving';
      
      final Uri uri = Uri.parse(googleMapsUrl);
      
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        throw 'Could not launch Google Maps';
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error opening Google Maps: $e')),
      );
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  void _loadTestData() {
    // Test data with real Vancouver addresses
    final testDeliveries = [
      Delivery(
        id: 'test-1',
        address: '1401 W Broadway, Vancouver, BC',
        customerName: 'Alice Johnson',
        eta: '10:30 AM',
        lat: 49.2634,
        lng: -123.1456,
      ),
      Delivery(
        id: 'test-2', 
        address: '800 Robson St, Vancouver, BC',
        customerName: 'Bob Smith',
        eta: '11:15 AM',
        lat: 49.2837,
        lng: -123.1207,
      ),
      Delivery(
        id: 'test-3',
        address: '1055 W Georgia St, Vancouver, BC',
        customerName: 'Carol Davis',
        eta: '12:00 PM',
        lat: 49.2842,
        lng: -123.1189,
      ),
    ];

    setState(() {
      driverName = 'Test Driver';
      deliveries = testDeliveries;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Test route loaded! Try the navigation.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Delivery Route - $driverName'),
        backgroundColor: Colors.blue,
        actions: [
          // Test button for development
          IconButton(
            icon: Icon(Icons.bug_report),
            onPressed: _loadTestData,
            tooltip: 'Load Test Data',
          ),
        ],
      ),
      body: deliveries.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.local_shipping, size: 80, color: Colors.grey),
                  SizedBox(height: 20),
                  Text(
                    'No deliveries assigned',
                    style: TextStyle(fontSize: 18, color: Colors.grey),
                  ),
                  SizedBox(height: 10),
                  Text(
                    'You will receive a notification when a new route is available',
                    style: TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: _loadTestData,
                    child: Text('Load Test Route'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.all(16),
                  child: ElevatedButton.icon(
                    onPressed: isLoading ? null : _openGoogleMaps,
                    icon: isLoading 
                        ? SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(Icons.navigation),
                    label: Text(isLoading ? 'Opening...' : 'Start Navigation'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(vertical: 15),
                      textStyle: TextStyle(fontSize: 18),
                    ),
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: deliveries.length,
                    itemBuilder: (context, index) {
                      final delivery = deliveries[index];
                      return Card(
                        margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.blue,
                            child: Text(
                              '${index + 1}',
                              style: TextStyle(color: Colors.white),
                            ),
                          ),
                          title: Text(delivery.customerName),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(delivery.address),
                              SizedBox(height: 4),
                              Text(
                                'ETA: ${delivery.eta}',
                                style: TextStyle(color: Colors.green),
                              ),
                            ],
                          ),
                          isThreeLine: true,
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}

class Delivery {
  final String id;
  final String address;
  final String customerName;
  final String eta;
  final double lat;
  final double lng;

  Delivery({
    required this.id,
    required this.address,
    required this.customerName,
    required this.eta,
    required this.lat,
    required this.lng,
  });

  factory Delivery.fromJson(Map<String, dynamic> json) {
    return Delivery(
      id: json['id'] ?? '',
      address: json['address'] ?? '',
      customerName: json['customerName'] ?? '',
      eta: json['eta'] ?? 'Not available',
      lat: (json['lat'] ?? 0.0).toDouble(),
      lng: (json['lng'] ?? 0.0).toDouble(),
    );
  }
}
