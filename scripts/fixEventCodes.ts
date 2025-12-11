import prisma from '../src/lib/prisma'

async function main() {
  console.log('🔍 Vérification des codes...\n')
  
  // Récupérer tous les codes
  const codes = await prisma.eventCode.findMany({
    include: {
      events: {
        include: {
          event: { select: { name: true } }
        }
      }
    }
  })
  
  console.log(`📊 Total codes trouvés: ${codes.length}\n`)
  
  for (const code of codes) {
    console.log(`Code: ${code.code}`)
    console.log(`  - Master: ${code.isMaster}`)
    console.log(`  - Événements liés: ${code.events.length}`)
    if (code.events.length > 0) {
      code.events.forEach(e => {
        console.log(`    • ${e.event.name}`)
      })
    } else {
      console.log('    ⚠️  Aucun événement lié!')
    }
    console.log('')
  }
  
  // Récupérer tous les événements pour référence
  const events = await prisma.event.findMany({
    select: { id: true, name: true }
  })
  
  console.log(`\n📅 Événements disponibles:`)
  events.forEach(e => console.log(`  - ${e.name} (${e.id})`))
  
  // Si des codes n'ont pas d'événements, proposer de les lier
  const codesWithoutEvents = codes.filter(c => c.events.length === 0)
  
  if (codesWithoutEvents.length > 0) {
    console.log(`\n⚠️  ${codesWithoutEvents.length} code(s) sans événements détecté(s)`)
    console.log('\nVoulez-vous lier chaque code au premier événement disponible?')
    console.log('(Vous pourrez modifier cela depuis l\'interface admin ensuite)')
    
    if (events.length > 0) {
      console.log('\n🔧 Liaison automatique au premier événement...')
      
      for (const code of codesWithoutEvents) {
        await prisma.eventCodeEvent.create({
          data: {
            eventCodeId: code.id,
            eventId: events[0].id
          }
        })
        console.log(`✅ Code ${code.code} lié à ${events[0].name}`)
      }
      
      console.log('\n✨ Migration terminée!')
    }
  } else {
    console.log('\n✅ Tous les codes ont des événements liés')
  }
}

main()
  .catch(console.error)
  .finally(() => {})
