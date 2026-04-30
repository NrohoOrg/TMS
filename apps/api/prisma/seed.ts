import { PrismaClient, Role, Priority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (password: string) => bcrypt.hash(password, 10);

  // ── Clean existing data (order matters for FK constraints) ──
  await prisma.stopEvent.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.optimizationJob.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.task.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ──
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Karim Benali',
      phone: '+213 555 0101',
      passwordHash: await hash('Admin1234!'),
      role: Role.ADMIN,
    },
  });

  const dispatcher = await prisma.user.create({
    data: {
      email: 'dispatcher@example.com',
      name: 'Amira Hadj',
      phone: '+213 555 0102',
      passwordHash: await hash('Dispatch1234!'),
      role: Role.DISPATCHER,
    },
  });

  const cadre = await prisma.user.create({
    data: {
      email: 'cadre@example.com',
      name: 'Yacine Cadre',
      phone: '+213 555 0110',
      passwordHash: await hash('Cadre1234!'),
      role: Role.CADRE,
    },
  });

  console.log(`Created users: ${admin.name}, ${dispatcher.name}, ${cadre.name}`);

  // ── Drivers (real Algiers depots) ──
  const driversData = [
    {
      name: 'Youcef Merah',
      phone: '+213 555 0103',
      shiftStart: '08:00',
      shiftEnd: '17:00',
      depotLat: 36.7538,
      depotLng: 3.0588,
      capacityUnits: 15,
      active: true,
    },
    {
      name: 'Rachid Bouzid',
      phone: '+213 555 0105',
      shiftStart: '07:00',
      shiftEnd: '16:00',
      depotLat: 36.4722,
      depotLng: 2.8278,
      capacityUnits: 10,
      active: true,
    },
    {
      name: 'Fatima Zahra',
      phone: '+213 555 0106',
      shiftStart: '08:00',
      shiftEnd: '17:00',
      depotLat: 36.7538,
      depotLng: 3.0588,
      capacityUnits: 12,
      active: false, // on leave
    },
    {
      name: 'Mohamed Ait',
      phone: '+213 555 0107',
      shiftStart: '06:00',
      shiftEnd: '15:00',
      depotLat: 36.7538,
      depotLng: 3.0588,
      capacityUnits: 20,
      active: true,
    },
    {
      name: 'Salim Tounsi',
      phone: '+213 555 0108',
      shiftStart: '08:00',
      shiftEnd: '17:00',
      depotLat: 36.7538,
      depotLng: 3.0588,
      capacityUnits: 15,
      active: true,
    },
    {
      name: 'Omar Khaldi',
      phone: '+213 555 0109',
      shiftStart: '07:30',
      shiftEnd: '16:30',
      depotLat: 36.7538,
      depotLng: 3.0588,
      capacityUnits: 8,
      active: true,
    },
  ];

  const drivers = await Promise.all(
    driversData.map((d) => prisma.driver.create({ data: d })),
  );
  console.log(`Created ${drivers.length} drivers`);

  // ── Today's date for tasks ──
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = today.getUTCMonth();
  const dd = today.getUTCDate();

  function todayAt(hours: number, minutes = 0): Date {
    return new Date(Date.UTC(yyyy, mm, dd, hours, minutes, 0, 0));
  }

  // ── Tasks: realistic Algiers deliveries & pickups ──
  const tasksData = [
    // URGENT
    {
      title: 'Medical Supplies to Mustapha Hospital',
      pickupAddress: 'Pharmacy Central, Rue Didouche Mourad, Algiers',
      pickupLat: 36.7631,
      pickupLng: 3.0506,
      pickupWindowStart: todayAt(6, 0),
      pickupWindowEnd: todayAt(7, 0),
      pickupServiceMinutes: 5,
      dropoffAddress: 'CHU Mustapha Pacha, Place du 1er Mai, Algiers',
      dropoffLat: 36.7590,
      dropoffLng: 3.0590,
      priority: Priority.urgent,
      status: TaskStatus.pending,
      notes: 'Cold chain - handle with care',
    },
    {
      title: 'VIP Airport Pickup',
      pickupAddress: 'Houari Boumediene Airport, Terminal 1',
      pickupLat: 36.6910,
      pickupLng: 3.2153,
      pickupWindowStart: todayAt(8, 0),
      pickupWindowEnd: todayAt(9, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Hotel Sofitel Algiers Hamma Garden',
      dropoffLat: 36.7490,
      dropoffLng: 3.0710,
      priority: Priority.urgent,
      status: TaskStatus.pending,
      notes: 'Contact: M. Khalil +213 555 1001',
    },
    {
      title: 'Emergency Lab Samples',
      pickupAddress: 'Clinique El Azhar, Ben Aknoun',
      pickupLat: 36.7580,
      pickupLng: 3.0120,
      pickupWindowStart: todayAt(7, 0),
      pickupWindowEnd: todayAt(8, 0),
      pickupServiceMinutes: 5,
      dropoffAddress: 'Institut Pasteur Algerie, Rue du Docteur Laveran',
      dropoffLat: 36.7648,
      dropoffLng: 3.0535,
      priority: Priority.urgent,
      status: TaskStatus.pending,
      notes: 'Biohazard - special handling required',
    },
    // HIGH
    {
      title: 'Office Equipment to Hydra',
      pickupAddress: 'Warehouse Zone Industrielle, Oued Smar',
      pickupLat: 36.7100,
      pickupLng: 3.1490,
      pickupWindowStart: todayAt(9, 0),
      pickupWindowEnd: todayAt(10, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Client Office, Rue Ahmed Ghermoul, Hydra',
      dropoffLat: 36.7450,
      dropoffLng: 3.0370,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: 'Contact: Samira R. +213 555 1004',
    },
    {
      title: 'Staff Transport to Training Center',
      pickupAddress: 'Office Bab Ezzouar, Cite 8 Mai',
      pickupLat: 36.7220,
      pickupLng: 3.1820,
      pickupWindowStart: todayAt(7, 30),
      pickupWindowEnd: todayAt(8, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'INPED Training Center, Boumerdes',
      dropoffLat: 36.7540,
      dropoffLng: 3.4710,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: '8 employees - HR Dept',
    },
    {
      title: 'Restaurant Supply Run',
      pickupAddress: 'Marche de Gros, Semmar, Algiers',
      pickupLat: 36.7150,
      pickupLng: 3.1100,
      pickupWindowStart: todayAt(6, 0),
      pickupWindowEnd: todayAt(8, 0),
      pickupServiceMinutes: 20,
      dropoffAddress: 'Restaurant El Djenina, Rue Larbi Ben Mhidi',
      dropoffLat: 36.7710,
      dropoffLng: 3.0600,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: 'Fresh produce - perishable',
    },
    {
      title: 'Bank Document Delivery',
      pickupAddress: 'BNA Head Office, Rue Hassiba Ben Bouali',
      pickupLat: 36.7530,
      pickupLng: 3.0560,
      pickupWindowStart: todayAt(9, 0),
      pickupWindowEnd: todayAt(10, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'BNA Branch, El Biar',
      dropoffLat: 36.7680,
      dropoffLng: 3.0350,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: 'Confidential - signature required',
    },
    // NORMAL
    {
      title: 'Furniture Delivery to Bab El Oued',
      pickupAddress: 'Ikea Showroom, Mohammadia Mall',
      pickupLat: 36.7160,
      pickupLng: 3.1180,
      pickupWindowStart: todayAt(9, 0),
      pickupWindowEnd: todayAt(12, 0),
      pickupServiceMinutes: 20,
      dropoffAddress: 'Residence Bab El Oued, Rue de la Liberte',
      dropoffLat: 36.7870,
      dropoffLng: 3.0470,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: 'Heavy items - 2 person lift needed',
    },
    {
      title: 'Electronics to Kouba Store',
      pickupAddress: 'Warehouse B, Zone Industrielle Rouiba',
      pickupLat: 36.7340,
      pickupLng: 3.2830,
      pickupWindowStart: todayAt(8, 0),
      pickupWindowEnd: todayAt(11, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'TechnoStore, Avenue Mohamed V, Kouba',
      dropoffLat: 36.7270,
      dropoffLng: 3.0560,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },
    {
      title: 'Port Container Pickup',
      pickupAddress: 'Port dAlger, Mole J4',
      pickupLat: 36.7720,
      pickupLng: 3.0660,
      pickupWindowStart: todayAt(10, 0),
      pickupWindowEnd: todayAt(11, 0),
      pickupServiceMinutes: 30,
      dropoffAddress: 'Entrepot Blida, Zone Industrielle',
      dropoffLat: 36.4700,
      dropoffLng: 2.8280,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: 'Container #ALG-4521 - customs cleared',
    },
    {
      title: 'Catering to Conference Hall',
      pickupAddress: 'Traiteur El Baraka, Bir Mourad Rais',
      pickupLat: 36.7340,
      pickupLng: 3.0510,
      pickupWindowStart: todayAt(10, 0),
      pickupWindowEnd: todayAt(11, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Palais des Congres, Club des Pins',
      dropoffLat: 36.7550,
      dropoffLng: 2.9450,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: '50 person lunch - keep warm',
    },
    {
      title: 'Construction Materials',
      pickupAddress: 'Cimenterie de Rais Hamidou',
      pickupLat: 36.7700,
      pickupLng: 3.0200,
      pickupWindowStart: todayAt(7, 0),
      pickupWindowEnd: todayAt(10, 0),
      pickupServiceMinutes: 25,
      dropoffAddress: 'Chantier Dely Ibrahim',
      dropoffLat: 36.7520,
      dropoffLng: 3.0040,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },
    {
      title: 'Textile Shipment',
      pickupAddress: 'Atelier Textile, Hussein Dey',
      pickupLat: 36.7370,
      pickupLng: 3.0970,
      pickupWindowStart: todayAt(9, 0),
      pickupWindowEnd: todayAt(12, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Boutique Mode, Rue Ben Mhidi, Centre',
      dropoffLat: 36.7700,
      dropoffLng: 3.0580,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },
    {
      title: 'School Supplies Delivery',
      pickupAddress: 'Papeterie Centrale, Belouizdad',
      pickupLat: 36.7470,
      pickupLng: 3.0680,
      pickupWindowStart: todayAt(8, 0),
      pickupWindowEnd: todayAt(10, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Ecole Primaire Chevalley, El Biar',
      dropoffLat: 36.7630,
      dropoffLng: 3.0290,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },
    {
      title: 'Water Delivery',
      pickupAddress: 'Depot Ifri, Rouiba',
      pickupLat: 36.7290,
      pickupLng: 3.2760,
      pickupWindowStart: todayAt(7, 0),
      pickupWindowEnd: todayAt(11, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Hotel Hilton, Pins Maritimes',
      dropoffLat: 36.7530,
      dropoffLng: 2.9730,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: '200 bottles - use freight elevator',
    },
    {
      title: 'Auto Parts Transfer',
      pickupAddress: 'Renault Algerie, Zone Oued Smar',
      pickupLat: 36.7050,
      pickupLng: 3.1550,
      pickupWindowStart: todayAt(8, 0),
      pickupWindowEnd: todayAt(10, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Garage Bouzid, Rue de Tripoli, Hydra',
      dropoffLat: 36.7430,
      dropoffLng: 3.0340,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },
    {
      title: 'Flower Delivery for Event',
      pickupAddress: 'Jardinerie Sahel, Ain Taya',
      pickupLat: 36.7930,
      pickupLng: 3.2870,
      pickupWindowStart: todayAt(8, 0),
      pickupWindowEnd: todayAt(10, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Salle des Fetes, Cheraga',
      dropoffLat: 36.7650,
      dropoffLng: 2.9610,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: 'Fragile - keep upright',
    },
    // LOW
    {
      title: 'Archive Boxes to Storage',
      pickupAddress: 'Sonatrach HQ, Djenane El Malik, Hydra',
      pickupLat: 36.7390,
      pickupLng: 3.0370,
      pickupWindowStart: todayAt(8, 0),
      pickupWindowEnd: todayAt(15, 0),
      pickupServiceMinutes: 20,
      dropoffAddress: 'Self Storage Algiers, Birkhadem',
      dropoffLat: 36.7180,
      dropoffLng: 3.0540,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: '12 archive boxes',
    },
    {
      title: 'Return Empty Pallets',
      pickupAddress: 'Supermarche Uno, Bab Ezzouar',
      pickupLat: 36.7200,
      pickupLng: 3.1860,
      pickupWindowStart: todayAt(10, 0),
      pickupWindowEnd: todayAt(15, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Centre Logistique, Dar El Beida',
      dropoffLat: 36.7140,
      dropoffLng: 3.2200,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },
    {
      title: 'Office Recycling Pickup',
      pickupAddress: 'Tour Business Center, Mohammadia',
      pickupLat: 36.7130,
      pickupLng: 3.1130,
      pickupWindowStart: todayAt(11, 0),
      pickupWindowEnd: todayAt(16, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Centre de Tri, Baraki',
      dropoffLat: 36.6670,
      dropoffLng: 3.0960,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },
  ];

  const tasks = await Promise.all(
    tasksData.map((t) => prisma.task.create({ data: t })),
  );
  console.log(`Created ${tasks.length} tasks`);

  // ── Availability: all active drivers available today ──
  const todayDate = new Date(Date.UTC(yyyy, mm, dd));
  for (const driver of drivers) {
    if (driver.active) {
      await prisma.availability.create({
        data: {
          driverId: driver.id,
          date: todayDate,
          available: true,
        },
      });
    }
  }
  console.log('Created availability records for today');

  // ── Config (Hyundai Accent fleet on petrol; equal weight on time + fuel) ──
  const configValues = {
    maxSolveSeconds: 30,
    speedKmh: 50,
    objectiveWeights: { urgent: 1000, high: 500, normal: 100, low: 10 },
    pickupServiceMinutesDefault: 20,
    dropoffServiceMinutesDefault: 5,
    colocatedMarginalServiceSeconds: 60,
    dropoffWithinHours: 2,
    loadBalancingKmPerTask: 15,
    co2GramsPerKm: 140,
    fuelLPer100Km: 6,
    dieselPricePerLiterDZD: 47,
    timeCostDzdPerHour: 70,
    unassignedPenaltyNormalDzd: 100000,
    unassignedPenaltyUrgentDzd: 1000000,
  };
  await prisma.config.upsert({
    where: { id: 1 },
    update: configValues,
    create: { id: 1, ...configValues },
  });
  console.log('Config updated');

  // ── Geocode cache ──
  await prisma.geocodeCache.upsert({
    where: { normalizedQuery: 'algiers' },
    update: {
      results: [
        {
          placeId: 'algiers-seed',
          displayName: 'Algiers, Algeria',
          lat: 36.7538,
          lng: 3.0588,
          type: 'city',
          importance: 0.9,
        },
      ],
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    },
    create: {
      normalizedQuery: 'algiers',
      results: [
        {
          placeId: 'algiers-seed',
          displayName: 'Algiers, Algeria',
          lat: 36.7538,
          lng: 3.0588,
          type: 'city',
          importance: 0.9,
        },
      ],
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    },
  });

  console.log('\n=== Seed Summary ===');
  console.log(`Users:   2 (admin + dispatcher)`);
  console.log(`Drivers: ${drivers.length} (${drivers.filter(d => d.active).length} active)`);
  console.log(`Tasks:   ${tasks.length} for today (${todayDate.toISOString().slice(0, 10)})`);
  console.log(`  urgent: ${tasksData.filter(t => t.priority === Priority.urgent).length}`);
  console.log(`  normal: ${tasksData.filter(t => t.priority === Priority.normal).length}`);
  console.log(`\nCredentials:`);
  console.log(`  Admin:      admin@example.com / Admin1234!`);
  console.log(`  Dispatcher: dispatcher@example.com / Dispatch1234!`);
  console.log(`  Cadre:      cadre@example.com / Cadre1234!`);
  console.log(`\nOptimize for date: ${todayDate.toISOString().slice(0, 10)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
