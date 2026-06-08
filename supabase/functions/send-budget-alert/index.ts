import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

const FROM_ADDRESS = 'M&M Finance <onboarding@resend.dev>'

// Hardcoded user registry — private two-person app
const USERS: Record<string, { name: string; email: string }> = {
  'c722d728-5abe-41fe-9965-3f5d5c69a891': { name: 'Matthew', email: 'sandersonmatthew875@gmail.com' },
  '45b7ef92-2b47-47a8-ae2b-f7348271b62c': { name: 'Maddy',   email: 'maddycarltonware@gmail.com'   },
}

const ALL_USERS = Object.values(USERS)

// ── Helpers ──────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function emailHtml({
  categoryName,
  amountSpent,
  budget,
  pct,
  month,
  recipientName,
  isJoint,
}: {
  categoryName: string
  amountSpent: number
  budget: number
  pct: number
  month: string
  recipientName: string
  isJoint: boolean
}) {
  const monthLabel = new Date(month + 'T00:00:00').toLocaleString('en-GB', { month: 'long', year: 'numeric' })
  const remaining  = budget - amountSpent
  const isOver     = pct >= 100
  const accentColor = isOver ? '#f43f5e' : '#f59e0b'
  const label       = isOver ? 'Over budget' : '80% reached'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d12;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#17171f;border-radius:16px;border:1px solid rgba(255,255,255,0.10);overflow:hidden">

        <!-- Header -->
        <tr>
          <td style="padding:28px 28px 20px;border-bottom:1px solid rgba(255,255,255,0.07)">
            <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b6b7b">M&amp;M Finance</p>
            <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#f0f0f5">Budget alert</p>
          </td>
        </tr>

        <!-- Badge + category -->
        <tr>
          <td style="padding:24px 28px 0">
            <span style="display:inline-block;background:${accentColor}26;color:${accentColor};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:4px 10px;border-radius:6px">${label}</span>
            <p style="margin:12px 0 0;font-size:22px;font-weight:700;color:#f0f0f5">${categoryName}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#9898a8">${isJoint ? 'Joint spending' : 'Personal spending'} · ${monthLabel}</p>
          </td>
        </tr>

        <!-- Figures -->
        <tr>
          <td style="padding:20px 28px">
            <table width="100%" style="background:#20202c;border-radius:12px;border:1px solid rgba(255,255,255,0.11)">
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.07)">
                  <span style="font-size:12px;color:#9898a8">Spent</span>
                  <span style="float:right;font-size:14px;font-weight:700;color:${accentColor}">${fmt(amountSpent)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.07)">
                  <span style="font-size:12px;color:#9898a8">Budget</span>
                  <span style="float:right;font-size:14px;font-weight:700;color:#f0f0f5">${fmt(budget)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px">
                  <span style="font-size:12px;color:#9898a8">${remaining >= 0 ? 'Remaining' : 'Over by'}</span>
                  <span style="float:right;font-size:14px;font-weight:700;color:${remaining >= 0 ? '#34d399' : '#f43f5e'}">${fmt(Math.abs(remaining))}</span>
                </td>
              </tr>
            </table>

            <!-- Progress bar -->
            <div style="margin-top:16px;background:rgba(255,255,255,0.08);border-radius:4px;height:6px;overflow:hidden">
              <div style="height:100%;width:${Math.min(pct, 100)}%;background:${accentColor};border-radius:4px"></div>
            </div>
            <p style="margin:6px 0 0;font-size:12px;color:#6b6b7b">${Math.round(pct)}% of monthly budget used</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px 24px;border-top:1px solid rgba(255,255,255,0.07)">
            <p style="margin:0;font-size:12px;color:#6b6b7b">Hi ${recipientName} — you're receiving this because you reached the budget threshold for this category. You won't receive another alert for <strong style="color:#9898a8">${categoryName}</strong> this month.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Send via Resend ──────────────────────────────────────────────

async function sendEmail({
  to,
  recipientName,
  categoryName,
  amountSpent,
  budget,
  month,
  isJoint,
}: {
  to: string
  recipientName: string
  categoryName: string
  amountSpent: number
  budget: number
  month: string
  isJoint: boolean
}) {
  const pct    = budget > 0 ? (amountSpent / budget) * 100 : 0
  const isOver = pct >= 100
  const subject = isOver
    ? `Over budget: ${categoryName}`
    : `80% budget alert: ${categoryName}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html: emailHtml({ categoryName, amountSpent, budget, pct, month, recipientName, isJoint }),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`Resend error for ${to}:`, res.status, text)
  }
}

// ── Main handler ─────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const {
      type,
      categoryName,
      amountSpent,
      budget,
      month,
      userId,
    }: {
      type: 'joint' | 'personal' | 'disposable'
      categoryName: string
      amountSpent: number
      budget: number
      month: string
      userId?: string
      threshold?: string
    } = await req.json()

    if (!categoryName || amountSpent == null || !budget || !month || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    if (type === 'joint') {
      // Send to both users
      await Promise.all(
        ALL_USERS.map(u =>
          sendEmail({ to: u.email, recipientName: u.name, categoryName, amountSpent, budget, month, isJoint: true })
        )
      )
    } else {
      // 'personal' or 'disposable' — send to a specific user
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId required for personal/disposable alerts' }), { status: 400 })
      }

      const user = USERS[userId]
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unknown userId' }), { status: 400 })
      }

      await sendEmail({ to: user.email, recipientName: user.name, categoryName, amountSpent, budget, month, isJoint: false })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-budget-alert error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
