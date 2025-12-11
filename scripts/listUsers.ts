import prisma from '../src/lib/prisma'

async function main(){
  const users = await prisma.user.findMany({take:5})
  console.log('Found users:', users.map(u=>({id:u.id,name:u.name})))
  await prisma.$disconnect()
}

main()
