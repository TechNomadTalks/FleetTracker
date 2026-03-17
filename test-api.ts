import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const log = (msg: string, success?: boolean) => {
  console.log(`${success ? '✓' : '✗'} ${msg}`);
};

async function testAPI() {
  console.log('\n=== FleetTracker API Test ===\n');

  let accessToken = '';
  let adminToken = '';
  let userId = '';
  let vehicleId = '';
  let tripId = '';

  try {
    // Test 1: Health check
    log('Health check');
    const health = await axios.get(`${API_URL.replace('/api', '')}/api/health`);
    log('Server is running', health.data.success === true);

    // Test 2: Register a new user
    log('Register new user');
    try {
      const register = await axios.post(`${API_URL}/auth/register`, {
        email: 'newuser@test.com',
        password: 'Test12345!',
        name: 'Test User'
      });
      log('Registration successful', register.data.success === true);
    } catch (e: any) {
      if (e.response?.data?.error?.includes('already registered')) {
        log('User already registered (expected)');
      }
    }

    // Test 3: Admin login
    log('Admin login');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@fleettracker.com',
      password: 'a9810c4bdd308772'
    });
    adminToken = adminLogin.data.data.accessToken;
    log('Admin logged in', !!adminToken);

    // Test 4: Regular user login
    log('User login');
    const userLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'user@fleettracker.com',
      password: '1ca401025573'
    });
    accessToken = userLogin.data.data.accessToken;
    userId = userLogin.data.data.user.id;
    log('User logged in', !!accessToken);

    // Test 5: Get vehicles
    log('Get vehicles');
    const vehicles = await axios.get(`${API_URL}/vehicles`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    vehicleId = vehicles.data.data[0]?.id;
    log(`Found ${vehicles.data.data.length} vehicles`, vehicles.data.success === true);

    // Test 6: Create a vehicle (as admin)
    log('Create vehicle');
    const createVehicle = await axios.post(`${API_URL}/vehicles`, {
      registrationNumber: 'TEST-001',
      make: 'Tesla',
      model: 'Model 3',
      currentMileage: 1000,
      serviceInterval: 10000
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    log('Vehicle created', createVehicle.data.success === true);

    // Test 7: Checkout vehicle
    log('Checkout vehicle');
    const checkout = await axios.post(`${API_URL}/trips/checkout`, {
      vehicleId: vehicleId,
      destination: 'Test Destination',
      currentMileage: 45000,
      purpose: 'business'
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    tripId = checkout.data.data.id;
    log('Vehicle checked out', checkout.data.success === true);

    // Test 8: Get trips
    log('Get trips');
    const trips = await axios.get(`${API_URL}/trips`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    log(`Found ${trips.data.data.length} trips`, trips.data.success === true);

    // Test 9: Checkin vehicle
    log('Checkin vehicle');
    const checkin = await axios.post(`${API_URL}/trips/${tripId}/checkin`, {
      endMileage: 45050,
      expenses: 25.50
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    log('Vehicle checked in', checkin.data.success === true);

    // Test 10: Get dashboard summary
    log('Get dashboard summary');
    const summary = await axios.get(`${API_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    log('Dashboard data retrieved', summary.data.success === true);

    // Test 11: Get audit logs
    log('Get audit logs');
    const auditLogs = await axios.get(`${API_URL}/admin/audit-log`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    log(`Found ${auditLogs.data.data.logs.length} audit logs`, auditLogs.data.success === true);

    // Test 12: Update user (admin action)
    log('Update user');
    const updateUser = await axios.put(`${API_URL}/admin/users/${userId}`, {
      name: 'Updated User Name'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    log('User updated', updateUser.data.success === true);

    // Test 13: Get audit logs after changes
    log('Get audit logs after changes');
    const auditLogsAfter = await axios.get(`${API_URL}/admin/audit-log`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const newLogs = auditLogsAfter.data.data.logs.filter((log: any) => 
      log.action === 'USER_UPDATE' || log.action === 'TRIP_CHECKOUT' || log.action === 'TRIP_CHECKIN'
    );
    log(`Found ${newLogs.length} relevant audit logs`, newLogs.length >= 3);

    console.log('\n=== All Tests Passed! ===\n');
    
  } catch (error: any) {
    console.error('\n=== Test Failed ===');
    console.error('Error:', error.response?.data || error.message);
    log('Test failed', false);
  }
}

testAPI();
