// Edge Function: create-user
//
// Creates a new auth user (email + password + optional name) on behalf of an
// authenticated admin. The caller's JWT is verified and checked against the
// public.is_admin() SQL function before the service-role client is used.
//
// Deploy with:
//   supabase functions deploy create-user
//
// Body (JSON):
//   { "email": "user@example.com", "password": "...", "fullName": "..." }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

interface CreateUserPayload {
  email?: string
  password?: string
  fullName?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verify the caller's identity and admin status with an anon-scoped client.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  })

  const {
    data: { user },
    error: userError
  } = await callerClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401 })
  }

  const { data: isAdmin, error: adminError } = await callerClient.rpc('is_admin')
  if (adminError || !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  let payload: CreateUserPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const email = payload.email?.trim().toLowerCase()
  const password = payload.password ?? ''
  const fullName = payload.fullName?.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'E-mail inválido' }), { status: 400 })
  }
  if (password.length < 6) {
    return new Response(JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }), {
      status: 400
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined
  })

  if (createError) {
    return new Response(
      JSON.stringify({ error: createError.message }),
      { status: 400 }
    )
  }

  return new Response(
    JSON.stringify({ user: { id: created.user.id, email: created.user.email } }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  )
})
