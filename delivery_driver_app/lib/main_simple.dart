import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:io' show Platform;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
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
    _loadSavedRoute();
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

  void _openMapsNavigation({String mapsApp = 'auto'}) async {
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
      String mapsUrl;
      String appName;
      
      // Determine which maps app to use based on platform and user choice
      String selectedApp = mapsApp;
      if (mapsApp == 'auto') {
        // Auto-select based on platform
        if (_isAndroid) {
          selectedApp = 'google';
        } else if (_isIOS) {
          selectedApp = 'apple';
        } else {
          selectedApp = 'google'; // Default for other platforms
        }
      }
      
      switch (selectedApp) {
        case 'google':
          // Google Maps - Works on all platforms, best for multiple waypoints
          List<String> waypoints = deliveries.map((d) => '${d.lat},${d.lng}').toList();
          mapsUrl = 'https://www.google.com/maps/dir/?api=1&waypoints=${waypoints.join('|')}&travelmode=driving';
          appName = 'Google Maps';
          break;
          
        case 'apple':
          // Apple Maps - iOS only
          if (!_isIOS) {
            throw 'Apple Maps is only available on iOS';
          }
          if (deliveries.length == 1) {
            final delivery = deliveries.first;
            mapsUrl = 'http://maps.apple.com/?daddr=${delivery.lat},${delivery.lng}&dirflg=d';
          } else {
            final firstDelivery = deliveries.first;
            mapsUrl = 'http://maps.apple.com/?saddr=Current+Location&daddr=${firstDelivery.lat},${firstDelivery.lng}&dirflg=d';
          }
          appName = 'Apple Maps';
          break;
          
        case 'waze':
          // Waze - Navigate to first location (Waze doesn't support multiple waypoints via URL)
          final firstDelivery = deliveries.first;
          mapsUrl = 'https://waze.com/ul?ll=${firstDelivery.lat},${firstDelivery.lng}&navigate=yes';
          appName = 'Waze';
          break;
          
        default:
          throw 'Unknown maps app: $selectedApp';
      }
      
      print('Opening $appName with URL: $mapsUrl');
      
      final Uri uri = Uri.parse(mapsUrl);
      
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        
        String message = _getSuccessMessage(selectedApp, appName);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message)),
        );
      } else {
        throw 'Could not launch $appName';
      }
    } catch (e) {
      print('Error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error opening maps: $e')),
      );
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }
  
  String _getSuccessMessage(String selectedApp, String appName) {
    switch (selectedApp) {
      case 'google':
        return '$appName opened with ${deliveries.length} waypoints for optimal routing!';
      case 'apple':
        if (deliveries.length == 1) {
          return '$appName opened! Navigate to ${deliveries.first.customerName}';
        } else {
          return '$appName opened! Navigate to first stop: ${deliveries.first.customerName}. Check app for remaining ${deliveries.length - 1} stops.';
        }
      case 'waze':
        if (deliveries.length == 1) {
          return '$appName opened! Navigate to ${deliveries.first.customerName}';
        } else {
          return '$appName opened! Navigate to first stop: ${deliveries.first.customerName}. Add remaining ${deliveries.length - 1} stops manually.';
        }
      default:
        return '$appName opened successfully!';
    }
  }

  void _loadWebAppRoute() {
    // Simulate receiving route data from your web app
    // This would normally come from a push notification or API call
    const webAppRouteData = '''
{
  "driverId": "driver-001",
  "driverName": "John Smith",
  "deliveries": [
    {
      "id": "delivery-1",
      "address": "1234 Main St, Vancouver, BC",
      "customerName": "Sarah Wilson",
      "eta": "9:30 AM",
      "lat": 49.2827,
      "lng": -123.1207
    },
    {
      "id": "delivery-2", 
      "address": "5678 Oak Ave, Vancouver, BC",
      "customerName": "Mike Johnson",
      "eta": "10:15 AM",
      "lat": 49.2634,
      "lng": -123.1456
    },
    {
      "id": "delivery-3",
      "address": "999 Pine St, Vancouver, BC", 
      "customerName": "Lisa Chen",
      "eta": "11:00 AM",
      "lat": 49.2837,
      "lng": -123.1207
    },
    {
      "id": "delivery-4",
      "address": "777 Elm Rd, Vancouver, BC",
      "customerName": "David Kim", 
      "eta": "11:45 AM",
      "lat": 49.2842,
      "lng": -123.1189
    }
  ]
}
''';

    _handleNewRoute(webAppRouteData);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('✅ Route received from web app! 4 deliveries assigned to John Smith'),
        backgroundColor: Colors.green,
        duration: Duration(seconds: 3),
      ),
    );
  }

  // Platform detection that works on all platforms
  bool get _isIOS {
    try {
      return Platform.isIOS;
    } catch (e) {
      // On web or unsupported platforms, default to false
      return false;
    }
  }
  
  bool get _isAndroid {
    try {
      return Platform.isAndroid;
    } catch (e) {
      // On web or unsupported platforms, default to false  
      return false;
    }
  }
  
  String get _platformName {
    try {
      if (Platform.isIOS) return 'iOS';
      if (Platform.isAndroid) return 'Android'; 
      if (Platform.isMacOS) return 'macOS';
      if (Platform.isWindows) return 'Windows';
      if (Platform.isLinux) return 'Linux';
      return 'Unknown';
    } catch (e) {
      return 'Web';
    }
  }

  void _showManualInputDialog() {
    String jsonInput = '';
    
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('输入路线数据'),
          content: Container(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '从网页应用复制JSON数据并粘贴到下面:',
                  style: TextStyle(fontSize: 14),
                ),
                SizedBox(height: 16),
                TextField(
                  maxLines: 8,
                  decoration: InputDecoration(
                    hintText: '粘贴JSON数据...',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (value) {
                    jsonInput = value;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('取消'),
            ),
            ElevatedButton(
              onPressed: () {
                if (jsonInput.trim().isNotEmpty) {
                  _handleNewRoute(jsonInput);
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('✅ 路线数据已加载！'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              },
              child: Text('加载路线'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Delivery Route - $driverName'),
        backgroundColor: Colors.blue,
        actions: [
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
                    'Tap the test button to load sample data',
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
                      padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
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
                  child: Column(
                    children: [
                      // Platform-specific primary button
                      ElevatedButton.icon(
                        onPressed: isLoading ? null : () => _openMapsNavigation(),
                        icon: isLoading 
                            ? SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Icon(_isIOS ? Icons.map : Icons.location_on),
                        label: Text(isLoading 
                            ? 'Opening...' 
                            : _isIOS 
                                ? 'Apple Maps (Recommended)' 
                                : 'Google Maps (Recommended)'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isIOS ? Colors.blue : Colors.green,
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(vertical: 15),
                          textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          minimumSize: Size(double.infinity, 50),
                        ),
                      ),
                      SizedBox(height: 12),
                      
                      // Alternative options
                      Row(
                        children: [
                          // Google Maps (always available as alternative)
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: isLoading ? null : () => _openMapsNavigation(mapsApp: 'google'),
                              icon: Icon(Icons.public, size: 16),
                              label: Text(_isIOS ? 'Google Maps' : 'Google (Web)'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _isIOS ? Colors.green[600] : Colors.blue[600],
                                foregroundColor: Colors.white,
                                padding: EdgeInsets.symmetric(vertical: 12),
                                textStyle: TextStyle(fontSize: 14),
                              ),
                            ),
                          ),
                          SizedBox(width: 8),
                          // Waze option
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: isLoading ? null : () => _openMapsNavigation(mapsApp: 'waze'),
                              icon: Icon(Icons.navigation, size: 16),
                              label: Text('Waze'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.purple[600],
                                foregroundColor: Colors.white,
                                padding: EdgeInsets.symmetric(vertical: 12),
                                textStyle: TextStyle(fontSize: 14),
                              ),
                            ),
                          ),
                        ],
                      ),
                      
                      if (deliveries.length > 1) ...[
                        SizedBox(height: 8),
                        Text(
                          _isIOS 
                              ? '💡 ${deliveries.length} stops: Google Maps shows all waypoints, Apple Maps shows first stop'
                              : '💡 ${deliveries.length} stops: Google Maps shows optimal route with all waypoints',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                          textAlign: TextAlign.center,
                        ),
                      ],
                      
                      SizedBox(height: 8),
                      Text(
                        'Platform: ${_platformName}',
                        style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          onPressed: _loadWebAppRoute,
                          icon: Icon(Icons.cloud_download),
                          label: Text('接收路线 (模拟)'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      SizedBox(width: 8),
                      Expanded(
                        flex: 1,
                        child: ElevatedButton.icon(
                          onPressed: _showManualInputDialog,
                          icon: Icon(Icons.edit),
                          label: Text('手动输入'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.orange,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: deliveries.length,
                    itemBuilder: (context, index) {
                      final delivery = deliveries[index];
                      return Card(
                        margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        elevation: 4,
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.blue,
                            child: Text(
                              '${index + 1}',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ),
                          title: Text(
                            delivery.customerName,
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(height: 4),
                              Text(
                                delivery.address,
                                style: TextStyle(fontSize: 14),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'ETA: ${delivery.eta}',
                                style: TextStyle(color: Colors.green, fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),
                          isThreeLine: true,
                          trailing: Icon(Icons.location_on, color: Colors.red),
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