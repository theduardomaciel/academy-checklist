// Edge Function: cleanup-old-photos
//
// Deletes closing_sessions (and their closing_logs + storage photos) older
// than RETENTION_DAYS. Runs on a daily pg_cron schedule (see schema.sql).
//
// Deploy with:
//   supabase functions deploy cleanup-old-photos --no-verify-jwt
//
// This keeps storage usage on a rolling window instead of growing forever,
// which is what keeps the project inside Supabase's free-tier 1 GB bucket.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const RETENTION_DAYS = 60
const BUCKET = 'closing-photos'

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

  const { data: oldSessions, error: sessionsError } = await supabase
    .from('closing_sessions')
    .select('id')
    .lt('started_at', cutoff.toISOString())

  if (sessionsError) {
    return new Response(JSON.stringify({ error: sessionsError.message }), { status: 500 })
  }

  if (!oldSessions || oldSessions.length === 0) {
    return new Response(JSON.stringify({ deletedSessions: 0 }), { status: 200 })
  }

  let deletedPhotoCount = 0

  for (const session of oldSessions) {
    const { data: files } = await supabase.storage.from(BUCKET).list(session.id)
    if (files && files.length > 0) {
      const paths = files.map((f) => `${session.id}/${f.name}`)
      const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths)
      if (!removeError) deletedPhotoCount += paths.length
    }
  }

  // closing_logs cascade-deletes automatically via the FK constraint.
  const { error: deleteError } = await supabase
    .from('closing_sessions')
    .delete()
    .in(
      'id',
      oldSessions.map((s) => s.id)
    )

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 })
  }

  return new Response(
    JSON.stringify({ deletedSessions: oldSessions.length, deletedPhotos: deletedPhotoCount }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
