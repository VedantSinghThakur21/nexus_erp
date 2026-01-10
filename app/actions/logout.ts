'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function logoutUser() {
  const cookieStore = await cookies()
  
  // Delete all session cookies
  cookieStore.delete('sid')
  cookieStore.delete('user_id')
  cookieStore.delete('user_email')
  cookieStore.delete('full_name')
  cookieStore.delete('system_user')
  
  // Redirect to login page
  redirect('/login')
}
