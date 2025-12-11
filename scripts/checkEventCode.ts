import prisma from '../src/lib/prisma'

async function main() {
  const code = process.argv[2] || 'NOEL-2025-SOIR'
  console.log(`Querying EventCode for code=\"${code}\"`)
  try {
    const result = await prisma.eventCode.findUnique({ where: { code } })
    console.log('Result:', result)
  } catch (err) {
    console.error('Prisma query error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
