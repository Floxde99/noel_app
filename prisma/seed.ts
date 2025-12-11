import { Role, EventStatus, ContributionStatus, TaskStatus, PollType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import prisma from '../src/lib/prisma'

async function main() {
  console.log('🎄 Seeding database for Noël Family App...\n')

  // Clean up existing data
  await prisma.chatMessage.deleteMany()
  await prisma.pollVote.deleteMany()
  await prisma.pollOption.deleteMany()
  await prisma.poll.deleteMany()
  await prisma.task.deleteMany()
  await prisma.contribution.deleteMany()
  await prisma.eventUser.deleteMany()
  await prisma.eventCode.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.event.deleteMany()
  await prisma.user.deleteMany()

  console.log('✅ Cleaned up existing data\n')

  // Create Admin User
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Famille',
      email: 'admin@famille.fr',
      role: Role.ADMIN,
      avatar: '🎅',
    },
  })
  console.log(`👤 Created admin: ${admin.name}`)

  // Create Family Members
  const mamie = await prisma.user.create({
    data: {
      name: 'Mamie Françoise',
      email: 'mamie@famille.fr',
      role: Role.USER,
      avatar: '👵',
    },
  })

  const papy = await prisma.user.create({
    data: {
      name: 'Papy Jean',
      email: 'papy@famille.fr',
      role: Role.USER,
      avatar: '👴',
    },
  })

  const marie = await prisma.user.create({
    data: {
      name: 'Marie',
      role: Role.USER,
      avatar: '👩',
    },
  })

  const pierre = await prisma.user.create({
    data: {
      name: 'Pierre',
      role: Role.USER,
      avatar: '👨',
    },
  })

  const lucas = await prisma.user.create({
    data: {
      name: 'Lucas',
      role: Role.USER,
      avatar: '👦',
    },
  })

  const emma = await prisma.user.create({
    data: {
      name: 'Emma',
      role: Role.USER,
      avatar: '👧',
    },
  })

  console.log(`👥 Created ${6} family members\n`)

  // Create Event 1: Réveillon 24 Décembre
  const reveillon = await prisma.event.create({
    data: {
      name: 'Réveillon de Noël 2025',
      description: 'Soirée du réveillon chez Mamie et Papy. Apéro dès 19h, repas à 20h30. Échange de cadeaux vers minuit ! 🎁',
      date: new Date('2025-12-24T19:00:00'),
      endDate: new Date('2025-12-25T02:00:00'),
      location: '12 Rue des Sapins, 75001 Paris',
      mapUrl: 'https://maps.google.com/?q=12+Rue+des+Sapins+Paris',
      status: EventStatus.OPEN,
      bannerImage: '/images/reveillon-banner.jpg',
    },
  })

  // Create Event 2: Déjeuner 25 Décembre
  const dejeuner = await prisma.event.create({
    data: {
      name: 'Déjeuner de Noël 2025',
      description: 'Déjeuner de Noël en famille. Ouverture des cadeaux du Père Noël pour les enfants à 11h, repas à 12h30. 🎄',
      date: new Date('2025-12-25T11:00:00'),
      endDate: new Date('2025-12-25T17:00:00'),
      location: '12 Rue des Sapins, 75001 Paris',
      mapUrl: 'https://maps.google.com/?q=12+Rue+des+Sapins+Paris',
      status: EventStatus.OPEN,
      bannerImage: '/images/dejeuner-banner.jpg',
    },
  })

  console.log(`🎄 Created events: "${reveillon.name}" & "${dejeuner.name}"\n`)

  // Create Event Codes
  await prisma.eventCode.create({
    data: {
      code: 'NOEL-2025-SOIR',
      isActive: true,
      isMaster: false,
      events: {
        create: [{ eventId: reveillon.id }],
      },
    },
  })
  await prisma.eventCode.create({
    data: {
      code: 'NOEL-2025-MIDI',
      isActive: true,
      isMaster: false,
      events: {
        create: [{ eventId: dejeuner.id }],
      },
    },
  })
  await prisma.eventCode.create({
    data: {
      code: 'NOEL-FAMILLE-2025',
      isActive: true,
      isMaster: true,
      events: {
        create: [
          { eventId: reveillon.id },
          { eventId: dejeuner.id },
        ],
      },
    },
  })
  console.log('🔑 Created event codes: NOEL-2025-SOIR, NOEL-2025-MIDI, NOEL-FAMILLE-2025\n')

  // Add users to events
  const allUsers = [admin, mamie, papy, marie, pierre, lucas, emma]
  
  for (const user of allUsers) {
    await prisma.eventUser.create({
      data: {
        userId: user.id,
        eventId: reveillon.id,
      },
    })
    await prisma.eventUser.create({
      data: {
        userId: user.id,
        eventId: dejeuner.id,
      },
    })
  }
  console.log('👥 Added all users to both events\n')

  // Create Contributions for Réveillon
  await prisma.contribution.createMany({
    data: [
      {
        title: 'Foie gras maison',
        description: 'Foie gras mi-cuit avec confiture de figues',
        category: 'plat',
        quantity: 1,
        status: ContributionStatus.CONFIRMED,
        eventId: reveillon.id,
        assigneeId: mamie.id,
      },
      {
        title: 'Champagne',
        description: '3 bouteilles de Champagne Brut',
        category: 'boisson',
        quantity: 3,
        status: ContributionStatus.CONFIRMED,
        eventId: reveillon.id,
        assigneeId: pierre.id,
      },
      {
        title: 'Bûche de Noël',
        description: 'Bûche chocolat-marrons',
        category: 'plat',
        quantity: 1,
        status: ContributionStatus.PLANNED,
        eventId: reveillon.id,
        assigneeId: marie.id,
      },
      {
        title: 'Huîtres',
        description: '4 douzaines de fines de claire',
        category: 'plat',
        quantity: 4,
        status: ContributionStatus.PLANNED,
        eventId: reveillon.id,
        assigneeId: papy.id,
      },
      {
        title: 'Vin rouge',
        description: 'Bordeaux Saint-Émilion 2018',
        category: 'boisson',
        quantity: 2,
        status: ContributionStatus.CONFIRMED,
        eventId: reveillon.id,
        assigneeId: admin.id,
      },
      {
        title: 'Décoration table',
        description: 'Centre de table, bougies, serviettes',
        category: 'décor',
        quantity: 1,
        status: ContributionStatus.CONFIRMED,
        eventId: reveillon.id,
        assigneeId: emma.id,
      },
    ],
  })

  // Create Contributions for Déjeuner
  await prisma.contribution.createMany({
    data: [
      {
        title: 'Dinde aux marrons',
        description: 'Dinde fermière farcie aux marrons',
        category: 'plat',
        quantity: 1,
        status: ContributionStatus.PLANNED,
        eventId: dejeuner.id,
        assigneeId: mamie.id,
      },
      {
        title: 'Gratin dauphinois',
        description: 'Accompagnement pour la dinde',
        category: 'plat',
        quantity: 1,
        status: ContributionStatus.CONFIRMED,
        eventId: dejeuner.id,
        assigneeId: marie.id,
      },
      {
        title: 'Salade de fruits frais',
        description: 'Salade avec fruits de saison',
        category: 'plat',
        quantity: 1,
        status: ContributionStatus.PLANNED,
        eventId: dejeuner.id,
        assigneeId: lucas.id,
      },
      {
        title: 'Jus de fruits',
        description: 'Jus de pomme et jus d\'orange',
        category: 'boisson',
        quantity: 4,
        status: ContributionStatus.CONFIRMED,
        eventId: dejeuner.id,
        assigneeId: emma.id,
      },
    ],
  })

  console.log('🍽️  Created contributions for both events\n')

  // Create Poll for Réveillon
  const pollDessert = await prisma.poll.create({
    data: {
      title: 'Quel dessert préférez-vous pour le réveillon ?',
      description: 'Votez pour votre dessert préféré ! Les 2 plus votés seront préparés.',
      type: PollType.SINGLE,
      eventId: reveillon.id,
      isClosed: false,
    },
  })

  await prisma.pollOption.createMany({
    data: [
      { label: 'Bûche glacée vanille-framboise', pollId: pollDessert.id },
      { label: 'Bûche pâtissière chocolat', pollId: pollDessert.id },
      { label: 'Paris-Brest géant', pollId: pollDessert.id },
      { label: 'Tarte Tatin', pollId: pollDessert.id },
    ],
  })

  // Create Poll for Déjeuner
  const pollActivity = await prisma.poll.create({
    data: {
      title: 'Activité après le déjeuner ?',
      description: 'Que voulez-vous faire après manger ?',
      type: PollType.SINGLE,
      eventId: dejeuner.id,
      isClosed: false,
    },
  })

  await prisma.pollOption.createMany({
    data: [
      { label: 'Jeux de société', pollId: pollActivity.id },
      { label: 'Promenade digestive', pollId: pollActivity.id },
      { label: 'Film de Noël', pollId: pollActivity.id },
      { label: 'Karaoké de Noël', pollId: pollActivity.id },
    ],
  })

  console.log('📊 Created polls for both events\n')

  // Create Tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Préparer la table du réveillon',
        description: 'Mettre la nappe, les couverts, les verres',
        status: TaskStatus.TODO,
        eventId: reveillon.id,
        assigneeId: emma.id,
        createdById: admin.id,
        dueDate: new Date('2025-12-24T18:00:00'),
      },
      {
        title: 'Acheter le pain frais',
        description: 'Baguettes et pain de campagne',
        status: TaskStatus.TODO,
        eventId: reveillon.id,
        assigneeId: lucas.id,
        createdById: admin.id,
        dueDate: new Date('2025-12-24T17:00:00'),
      },
      {
        title: 'Installer le sapin',
        description: 'Monter et décorer le sapin de Noël',
        status: TaskStatus.DONE,
        eventId: reveillon.id,
        assigneeId: pierre.id,
        createdById: admin.id,
        dueDate: new Date('2025-12-20T12:00:00'),
      },
      {
        title: 'Préparer les cadeaux enfants',
        description: 'Emballer et cacher les cadeaux',
        status: TaskStatus.IN_PROGRESS,
        eventId: dejeuner.id,
        assigneeId: marie.id,
        createdById: admin.id,
        dueDate: new Date('2025-12-24T22:00:00'),
      },
      {
        title: 'Préparer le chocolat chaud',
        description: 'Pour le petit-déjeuner du 25',
        status: TaskStatus.TODO,
        eventId: dejeuner.id,
        assigneeId: mamie.id,
        createdById: admin.id,
        dueDate: new Date('2025-12-25T09:00:00'),
      },
    ],
  })

  console.log('✅ Created tasks for both events\n')

  // Create Chat Messages
  await prisma.chatMessage.createMany({
    data: [
      {
        content: 'Bonjour à tous ! Hâte de vous voir pour le réveillon ! 🎄',
        eventId: reveillon.id,
        userId: mamie.id,
      },
      {
        content: 'J\'ai réservé les huîtres, elles seront prêtes le 24 !',
        eventId: reveillon.id,
        userId: papy.id,
      },
      {
        content: 'Super Papy ! On va se régaler 🦪',
        eventId: reveillon.id,
        userId: marie.id,
      },
      {
        content: 'N\'oubliez pas de voter pour le dessert !',
        eventId: reveillon.id,
        userId: admin.id,
      },
    ],
  })

  console.log('💬 Created chat messages\n')

  console.log('═══════════════════════════════════════════════')
  console.log('🎄 DATABASE SEEDED SUCCESSFULLY! 🎄')
  console.log('═══════════════════════════════════════════════')
  console.log('')
  console.log('📋 Test Credentials:')
  console.log('   Admin: "Admin Famille" + code "NOEL-FAMILLE-2025"')
  console.log('   User:  "Mamie Françoise" + code "NOEL-2025-SOIR"')
  console.log('   User:  Any name + code "NOEL-2025-MIDI"')
  console.log('')
  console.log('🔑 Event Codes:')
  console.log('   - NOEL-2025-SOIR (Réveillon 24/12)')
  console.log('   - NOEL-2025-MIDI (Déjeuner 25/12)')
  console.log('   - NOEL-FAMILLE-2025 (Master code)')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
