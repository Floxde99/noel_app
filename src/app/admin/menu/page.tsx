import { redirect } from 'next/navigation'

export default function AdminMenuIndexRedirect() {
  redirect('/admin?tab=menu')
}
