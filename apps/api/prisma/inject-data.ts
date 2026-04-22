import { PrismaClient, Role, Priority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (password: string) => bcrypt.hash(password, 10);

  // ── Today's date helpers ──
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = today.getUTCMonth();
  const dd = today.getUTCDate();
  const todayDate = new Date(Date.UTC(yyyy, mm, dd));

  function todayAt(hours: number, minutes = 0): Date {
    return new Date(Date.UTC(yyyy, mm, dd, hours, minutes, 0, 0));
  }

  let driversAdded = 0;
  let tasksAdded = 0;
  let usersAdded = 0;

  // ═══════════════════════════════════════════════════════════════
  // 1. DISPATCHER USERS (2 additional)
  // ═══════════════════════════════════════════════════════════════
  const dispatchers = [
    {
      email: 'dispatcher2@example.com',
      name: 'Nadia Khelif',
      phone: '+213 555 0201',
      passwordHash: await hash('Dispatch1234!'),
      role: Role.DISPATCHER,
    },
    {
      email: 'dispatcher3@example.com',
      name: 'Sofiane Rahal',
      phone: '+213 555 0202',
      passwordHash: await hash('Dispatch1234!'),
      role: Role.DISPATCHER,
    },
  ];

  for (const u of dispatchers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({ data: u });
      usersAdded++;
      console.log(`  + User: ${u.name} (${u.email})`);
    } else {
      console.log(`  ~ User already exists: ${u.email}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. DRIVERS (4 additional)
  // ═══════════════════════════════════════════════════════════════
  const driversData = [
    {
      name: 'Kamel Sid Ahmed',
      phone: '+213 555 0301',
      shiftStart: '06:30',
      shiftEnd: '15:30',
      depotLat: 36.4722,   // Blida
      depotLng: 2.8278,
      capacityUnits: 18,
      active: true,
    },
    {
      name: 'Nadia Khelif',
      phone: '+213 555 0302',
      shiftStart: '08:00',
      shiftEnd: '17:00',
      depotLat: 36.7640,   // Boumerdes
      depotLng: 3.4740,
      capacityUnits: 12,
      active: true,
    },
    {
      name: 'Samir Bouazza',
      phone: '+213 555 0303',
      shiftStart: '07:00',
      shiftEnd: '16:00',
      depotLat: 36.4722,   // Blida
      depotLng: 2.8278,
      capacityUnits: 25,
      active: true,
    },
    {
      name: 'Lyes Hamani',
      phone: '+213 555 0304',
      shiftStart: '09:00',
      shiftEnd: '18:00',
      depotLat: 36.7640,   // Boumerdes
      depotLng: 3.4740,
      capacityUnits: 10,
      active: true,
    },
  ];

  const newDriverIds: string[] = [];
  for (const d of driversData) {
    // Check by phone (unique enough identifier)
    const existing = await prisma.driver.findFirst({ where: { phone: d.phone } });
    if (!existing) {
      const created = await prisma.driver.create({ data: d });
      newDriverIds.push(created.id);
      driversAdded++;
      console.log(`  + Driver: ${d.name} (depot: ${d.depotLat === 36.4722 ? 'Blida' : 'Boumerdes'})`);
    } else {
      newDriverIds.push(existing.id);
      console.log(`  ~ Driver already exists: ${d.name}`);
    }
  }

  // Create availability for new drivers
  for (const driverId of newDriverIds) {
    await prisma.availability.upsert({
      where: { driverId_date: { driverId, date: todayDate } },
      update: { available: true },
      create: { driverId, date: todayDate, available: true },
    });
  }
  console.log(`  Availability ensured for ${newDriverIds.length} injected drivers`);

  // ═══════════════════════════════════════════════════════════════
  // 3. TASKS (25 additional realistic tasks for today)
  // ═══════════════════════════════════════════════════════════════
  const tasksData = [
    // ── URGENT (4) ──
    {
      title: 'Pharmacy Order - Insulin Delivery',
      pickupAddress: 'Pharmacie Centrale, Rue Abane Ramdane, Algiers Centre',
      pickupLat: 36.7538,
      pickupLng: 3.0588,
      pickupWindowStart: todayAt(6, 0),
      pickupWindowEnd: todayAt(7, 0),
      pickupServiceMinutes: 5,
      dropoffAddress: 'Clinique El Harrach, Rue Principale, El Harrach',
      dropoffLat: 36.7200,
      dropoffLng: 3.1350,
      dropoffDeadline: todayAt(8, 0),
      dropoffServiceMinutes: 10,
      priority: Priority.urgent,
      status: TaskStatus.pending,
      notes: 'Refrigerated insulin - maintain cold chain at all times',
    },
    {
      title: 'Medical Equipment - Ventilator Transfer',
      pickupAddress: 'Hopital Beni Messous, Beni Messous',
      pickupLat: 36.7800,
      pickupLng: 3.0200,
      pickupWindowStart: todayAt(6, 30),
      pickupWindowEnd: todayAt(7, 30),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Centre de Sante, Draria',
      dropoffLat: 36.7180,
      dropoffLng: 3.0050,
      dropoffDeadline: todayAt(9, 0),
      dropoffServiceMinutes: 15,
      priority: Priority.urgent,
      status: TaskStatus.pending,
      notes: 'Fragile medical equipment - handle with extreme care',
    },
    {
      title: 'Government Documents - Ministry Urgent',
      pickupAddress: 'Ministere de lInterieur, Rue Dr Saadane, Algiers',
      pickupLat: 36.7631,
      pickupLng: 3.0506,
      pickupWindowStart: todayAt(7, 0),
      pickupWindowEnd: todayAt(7, 30),
      pickupServiceMinutes: 5,
      dropoffAddress: 'Wilaya de Boumerdes, Centre Ville',
      dropoffLat: 36.7640,
      dropoffLng: 3.4740,
      dropoffDeadline: todayAt(10, 0),
      dropoffServiceMinutes: 10,
      priority: Priority.urgent,
      status: TaskStatus.pending,
      notes: 'Sealed confidential documents - signature required on delivery',
    },
    {
      title: 'Emergency Blood Samples - Lab Transfer',
      pickupAddress: 'Clinique Ain Benian, Rue de la Plage, Ain Benian',
      pickupLat: 36.8010,
      pickupLng: 2.9200,
      pickupWindowStart: todayAt(7, 0),
      pickupWindowEnd: todayAt(8, 0),
      pickupServiceMinutes: 5,
      dropoffAddress: 'Laboratoire Central, CHU Bab El Oued',
      dropoffLat: 36.7870,
      dropoffLng: 3.0470,
      dropoffDeadline: todayAt(9, 30),
      dropoffServiceMinutes: 10,
      priority: Priority.urgent,
      status: TaskStatus.pending,
      notes: 'Biohazard samples - temperature sensitive',
    },

    // ── HIGH (6) ──
    {
      title: 'IT Equipment - Server Rack Delivery',
      pickupAddress: 'Depot Informatique, Zone Industrielle Reghaia',
      pickupLat: 36.7340,
      pickupLng: 3.3400,
      pickupWindowStart: todayAt(8, 0),
      pickupWindowEnd: todayAt(9, 0),
      pickupServiceMinutes: 20,
      dropoffAddress: 'Datacenter Algiers, Bouzareah',
      dropoffLat: 36.7800,
      dropoffLng: 3.0200,
      dropoffDeadline: todayAt(12, 0),
      dropoffServiceMinutes: 30,
      priority: Priority.high,
      status: TaskStatus.pending,
      notes: 'Heavy (120kg) - loading dock required. Contact: IT Dept +213 555 4010',
    },
    {
      title: 'Food Distribution - School Canteens',
      pickupAddress: 'Cuisine Centrale ONALAIT, Birtouta',
      pickupLat: 36.6500,
      pickupLng: 3.0500,
      pickupWindowStart: todayAt(6, 0),
      pickupWindowEnd: todayAt(7, 0),
      pickupServiceMinutes: 20,
      dropoffAddress: 'Ecole Primaire Zeralda, Rue des Ecoles',
      dropoffLat: 36.7120,
      dropoffLng: 2.8400,
      dropoffDeadline: todayAt(10, 0),
      dropoffServiceMinutes: 15,
      priority: Priority.high,
      status: TaskStatus.pending,
      notes: 'Meals for 300 students - keep hot containers sealed',
    },
    {
      title: 'Pharmacy Restock - Bouzareah Branch',
      pickupAddress: 'Entrepot Saidal, Hussein Dey',
      pickupLat: 36.7370,
      pickupLng: 3.0970,
      pickupWindowStart: todayAt(8, 0),
      pickupWindowEnd: todayAt(9, 30),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Pharmacie Bouzareah, Avenue Ali Khodja',
      dropoffLat: 36.7800,
      dropoffLng: 3.0200,
      dropoffDeadline: todayAt(11, 0),
      dropoffServiceMinutes: 10,
      priority: Priority.high,
      status: TaskStatus.pending,
    },
    {
      title: 'Construction Materials - Cement Bags',
      pickupAddress: 'Cimenterie Lafarge, Zone Industrielle Reghaia',
      pickupLat: 36.7340,
      pickupLng: 3.3400,
      pickupWindowStart: todayAt(7, 0),
      pickupWindowEnd: todayAt(8, 30),
      pickupServiceMinutes: 25,
      dropoffAddress: 'Chantier Staoueli, Lot 42, Route de Tipaza',
      dropoffLat: 36.7560,
      dropoffLng: 2.8820,
      dropoffDeadline: todayAt(11, 0),
      dropoffServiceMinutes: 20,
      priority: Priority.high,
      status: TaskStatus.pending,
      notes: '50 bags (2.5 tonnes) - flatbed truck required',
    },
    {
      title: 'Mail & Parcels - Express Morning Run',
      pickupAddress: 'Centre de Tri Postal, Caroubier, Algiers',
      pickupLat: 36.7530,
      pickupLng: 3.0560,
      pickupWindowStart: todayAt(7, 0),
      pickupWindowEnd: todayAt(8, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Bureau de Poste, Cheraga Centre',
      dropoffLat: 36.7680,
      dropoffLng: 2.9600,
      dropoffDeadline: todayAt(10, 0),
      dropoffServiceMinutes: 10,
      priority: Priority.high,
      status: TaskStatus.pending,
    },
    {
      title: 'School Transport - Morning Shift',
      pickupAddress: 'Arret Bus, Cite 500 Logements, Draria',
      pickupLat: 36.7180,
      pickupLng: 3.0050,
      pickupWindowStart: todayAt(7, 0),
      pickupWindowEnd: todayAt(7, 30),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Lycee International, Kouba',
      dropoffLat: 36.7270,
      dropoffLng: 3.0560,
      dropoffDeadline: todayAt(8, 30),
      dropoffServiceMinutes: 5,
      priority: Priority.high,
      status: TaskStatus.pending,
      notes: '15 students - wait for teacher confirmation',
    },

    // ── NORMAL (10) ──
    {
      title: 'Furniture Delivery - Living Room Set',
      pickupAddress: 'Showroom Meublatex, Ain Benian',
      pickupLat: 36.8010,
      pickupLng: 2.9200,
      pickupWindowStart: todayAt(9, 0),
      pickupWindowEnd: todayAt(11, 0),
      pickupServiceMinutes: 20,
      dropoffAddress: 'Residence Les Jardins, Lot 18, Staoueli',
      dropoffLat: 36.7560,
      dropoffLng: 2.8820,
      dropoffDeadline: todayAt(14, 0),
      dropoffServiceMinutes: 30,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: 'Sofa + dining table - 2 person lift needed. Call client 30 min before.',
    },
    {
      title: 'IT Equipment - Laptop Batch',
      pickupAddress: 'Depot Dell Algerie, Bab Ezzouar',
      pickupLat: 36.7220,
      pickupLng: 3.1820,
      pickupWindowStart: todayAt(9, 0),
      pickupWindowEnd: todayAt(11, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Bureau dEtudes, Rue Krim Belkacem, Algiers Centre',
      dropoffLat: 36.7538,
      dropoffLng: 3.0588,
      dropoffDeadline: todayAt(14, 0),
      dropoffServiceMinutes: 10,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: '20 laptops - check serial numbers on delivery',
    },
    {
      title: 'Textile Shipment - Summer Collection',
      pickupAddress: 'Usine Textile ENITEX, Zone Industrielle Draria',
      pickupLat: 36.7180,
      pickupLng: 3.0050,
      pickupWindowStart: todayAt(10, 0),
      pickupWindowEnd: todayAt(12, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Boutique Elegance, Centre Commercial Bab Ezzouar',
      dropoffLat: 36.7220,
      dropoffLng: 3.1820,
      dropoffDeadline: todayAt(15, 0),
      dropoffServiceMinutes: 10,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },
    {
      title: 'Food Distribution - Ramadan Baskets',
      pickupAddress: 'Entrepot Croissant Rouge, Kouba',
      pickupLat: 36.7270,
      pickupLng: 3.0560,
      pickupWindowStart: todayAt(9, 0),
      pickupWindowEnd: todayAt(11, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Maison de la Culture, Birtouta',
      dropoffLat: 36.6500,
      dropoffLng: 3.0500,
      dropoffDeadline: todayAt(14, 0),
      dropoffServiceMinutes: 20,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: '80 food baskets for distribution',
    },
    {
      title: 'Medical Equipment - Wheelchair Delivery',
      pickupAddress: 'Depot ONAAPH, Rue Hassiba Ben Bouali, Algiers',
      pickupLat: 36.7530,
      pickupLng: 3.0560,
      pickupWindowStart: todayAt(10, 0),
      pickupWindowEnd: todayAt(12, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Centre de Reeducation, El Harrach',
      dropoffLat: 36.7200,
      dropoffLng: 3.1350,
      dropoffDeadline: todayAt(15, 0),
      dropoffServiceMinutes: 15,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: '5 wheelchairs - assembly not required',
    },
    {
      title: 'Parcel Delivery - E-commerce Batch',
      pickupAddress: 'Entrepot Jumia, Zone Logistique Dar El Beida',
      pickupLat: 36.7140,
      pickupLng: 3.2200,
      pickupWindowStart: todayAt(8, 0),
      pickupWindowEnd: todayAt(10, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Point Relais, Centre Commercial Zeralda',
      dropoffLat: 36.7120,
      dropoffLng: 2.8400,
      dropoffDeadline: todayAt(14, 0),
      dropoffServiceMinutes: 10,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },
    {
      title: 'Construction Materials - Tiles for Villa',
      pickupAddress: 'Ceramique Condor, Zone Industrielle Reghaia',
      pickupLat: 36.7340,
      pickupLng: 3.3400,
      pickupWindowStart: todayAt(9, 0),
      pickupWindowEnd: todayAt(11, 0),
      pickupServiceMinutes: 20,
      dropoffAddress: 'Villa en Construction, Cheraga',
      dropoffLat: 36.7680,
      dropoffLng: 2.9600,
      dropoffDeadline: todayAt(15, 0),
      dropoffServiceMinutes: 20,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: '40 boxes of ceramic tiles - fragile',
    },
    {
      title: 'Office Supplies - Stationery Order',
      pickupAddress: 'Papeterie Aures, Belouizdad',
      pickupLat: 36.7470,
      pickupLng: 3.0680,
      pickupWindowStart: todayAt(10, 0),
      pickupWindowEnd: todayAt(13, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Agence APC Ain Benian, Rue Principale',
      dropoffLat: 36.8010,
      dropoffLng: 2.9200,
      dropoffDeadline: todayAt(16, 0),
      dropoffServiceMinutes: 5,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },
    {
      title: 'Pharmacy Order - Outpatient Prescriptions',
      pickupAddress: 'Pharmacie Ben Aknoun, Avenue Frantz Fanon',
      pickupLat: 36.7580,
      pickupLng: 3.0120,
      pickupWindowStart: todayAt(11, 0),
      pickupWindowEnd: todayAt(13, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Domicile Patient, Cite Amara, Staoueli',
      dropoffLat: 36.7560,
      dropoffLng: 2.8820,
      dropoffDeadline: todayAt(16, 0),
      dropoffServiceMinutes: 5,
      priority: Priority.normal,
      status: TaskStatus.pending,
      notes: 'Patient mobility limited - deliver to door',
    },
    {
      title: 'Water Bottles - Office Supply',
      pickupAddress: 'Depot Lalla Khedidja, Rouiba',
      pickupLat: 36.7290,
      pickupLng: 3.2760,
      pickupWindowStart: todayAt(8, 0),
      pickupWindowEnd: todayAt(12, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Immeuble Affaires, Boulevard Bougara, Cheraga',
      dropoffLat: 36.7680,
      dropoffLng: 2.9600,
      dropoffDeadline: todayAt(15, 0),
      dropoffServiceMinutes: 10,
      priority: Priority.normal,
      status: TaskStatus.pending,
    },

    // ── LOW (5) ──
    {
      title: 'Archive Transfer - Old Records',
      pickupAddress: 'Mairie de Kouba, Service Archives',
      pickupLat: 36.7270,
      pickupLng: 3.0560,
      pickupWindowStart: todayAt(10, 0),
      pickupWindowEnd: todayAt(15, 0),
      pickupServiceMinutes: 20,
      dropoffAddress: 'Depot Archives Wilaya, Birtouta',
      dropoffLat: 36.6500,
      dropoffLng: 3.0500,
      dropoffDeadline: todayAt(17, 0),
      dropoffServiceMinutes: 15,
      priority: Priority.low,
      status: TaskStatus.pending,
      notes: '8 cartons of old municipal records',
    },
    {
      title: 'Return Empty Crates - Beverage',
      pickupAddress: 'Supermarche Ardis, Draria',
      pickupLat: 36.7180,
      pickupLng: 3.0050,
      pickupWindowStart: todayAt(11, 0),
      pickupWindowEnd: todayAt(16, 0),
      pickupServiceMinutes: 10,
      dropoffAddress: 'Usine NCA Rouiba, Zone Industrielle',
      dropoffLat: 36.7290,
      dropoffLng: 3.2760,
      dropoffDeadline: todayAt(17, 30),
      dropoffServiceMinutes: 10,
      priority: Priority.low,
      status: TaskStatus.pending,
    },
    {
      title: 'Surplus Office Furniture Pickup',
      pickupAddress: 'Ancien Bureau Sonatrach, Hydra',
      pickupLat: 36.7390,
      pickupLng: 3.0370,
      pickupWindowStart: todayAt(12, 0),
      pickupWindowEnd: todayAt(16, 0),
      pickupServiceMinutes: 25,
      dropoffAddress: 'Association Caritative, Bab El Oued',
      dropoffLat: 36.7870,
      dropoffLng: 3.0470,
      dropoffDeadline: todayAt(17, 30),
      dropoffServiceMinutes: 20,
      priority: Priority.low,
      status: TaskStatus.pending,
      notes: 'Donation - 6 desks and 12 chairs',
    },
    {
      title: 'Garden Waste Disposal',
      pickupAddress: 'Jardin dEssai du Hamma, Algiers',
      pickupLat: 36.7490,
      pickupLng: 3.0710,
      pickupWindowStart: todayAt(13, 0),
      pickupWindowEnd: todayAt(16, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Decharge Communale, Reghaia',
      dropoffLat: 36.7340,
      dropoffLng: 3.3400,
      dropoffDeadline: todayAt(17, 30),
      dropoffServiceMinutes: 10,
      priority: Priority.low,
      status: TaskStatus.pending,
    },
    {
      title: 'Empty Pallet Return - Weekly',
      pickupAddress: 'Entrepot Metro, Bab Ezzouar',
      pickupLat: 36.7220,
      pickupLng: 3.1820,
      pickupWindowStart: todayAt(14, 0),
      pickupWindowEnd: todayAt(16, 0),
      pickupServiceMinutes: 15,
      dropoffAddress: 'Plateforme Logistique, Blida',
      dropoffLat: 36.4722,
      dropoffLng: 2.8278,
      dropoffDeadline: todayAt(18, 0),
      dropoffServiceMinutes: 10,
      priority: Priority.low,
      status: TaskStatus.pending,
    },
  ];

  for (const t of tasksData) {
    // Check by title + today's date range to avoid duplicates on re-run
    const existing = await prisma.task.findFirst({
      where: {
        title: t.title,
        pickupWindowStart: { gte: todayAt(0, 0) },
        pickupWindowEnd: { lte: todayAt(23, 59) },
      },
    });
    if (!existing) {
      await prisma.task.create({ data: t });
      tasksAdded++;
    } else {
      console.log(`  ~ Task already exists: "${t.title}"`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  const urgentCount = tasksData.filter((t) => t.priority === Priority.urgent).length;
  const highCount = tasksData.filter((t) => t.priority === Priority.high).length;
  const normalCount = tasksData.filter((t) => t.priority === Priority.normal).length;
  const lowCount = tasksData.filter((t) => t.priority === Priority.low).length;

  console.log('\n=== Injection Summary ===');
  console.log(`Date: ${todayDate.toISOString().slice(0, 10)}`);
  console.log(`Users added:   ${usersAdded} / ${dispatchers.length}`);
  console.log(`Drivers added: ${driversAdded} / ${driversData.length}`);
  console.log(`Tasks added:   ${tasksAdded} / ${tasksData.length}`);
  console.log(`  urgent: ${urgentCount}, high: ${highCount}, normal: ${normalCount}, low: ${lowCount}`);
  console.log('\nNew dispatcher credentials:');
  console.log('  dispatcher2@example.com / Dispatch1234!');
  console.log('  dispatcher3@example.com / Dispatch1234!');
  console.log('\nNew drivers: Kamel Sid Ahmed (Blida), Nadia Khelif (Boumerdes), Samir Bouazza (Blida), Lyes Hamani (Boumerdes)');
  console.log('\nDone. No existing data was deleted.');
}

main()
  .catch((e) => {
    console.error('Injection failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
