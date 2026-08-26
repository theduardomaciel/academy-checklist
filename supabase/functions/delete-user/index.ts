// Edge Function: delete-user
//
// Deletes an auth user (and, via ON DELETE CASCADE, their profile) on behalf of
// an authenticated admin. The caller's JWT is verified and checked against the
// public.is_admin() SQL function before the service-role client is used.
// Admins cannot be deleted through this endpoint.
//
// Deploy with:
//   supabase functions deploy delete-user
//
// Body (JSON):
//   { "uid": "<user-uuid>" }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

interface DeleteUserPayload {
  uid?: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
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
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }

  const { data: isAdmin, error: adminError } = await callerClient.rpc('is_admin')
  if (adminError || !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }

  let payload: DeleteUserPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }

  const uid = payload.uid?.trim()
  if (!uid || !/^[0-9a-fA-F-]{36}$/.test(uid)) {
    return new Response(JSON.stringify({ error: 'UID inválido' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }

  // Only non-admin users may be deleted.
  const { data: target, error: targetError } = await callerClient
    .from('profiles')
    .select('is_admin')
    .eq('id', uid)
    .maybeSingle()

  if (targetError) {
    return new Response(
      JSON.stringify({ error: targetError.message }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
  if (!target) {
    return new Response(JSON.stringify({ error: 'Usuário não encontrado.' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }
  if (target.is_admin) {
    return new Response(
      JSON.stringify({ error: 'Não é possível excluir um administrador.' }),
      { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  // Never let an admin delete their own account through this endpoint.
  if (uid === user.id) {
    return new Response(
      JSON.stringify({ error: 'Não é possível excluir a própria conta.' }),
      { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(uid)
  if (deleteError) {
    return new Response(
      JSON.stringify({ error: deleteError.message }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
})
