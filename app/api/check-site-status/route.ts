import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteName = searchParams.get('site')

    if (!siteName) {
      return NextResponse.json({ error: 'Site name required' }, { status: 400 })
    }

    // Validate site name format to prevent shell injection
    // Only allow alphanumeric, dots, and hyphens (valid domain characters)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.\-]*$/.test(siteName) || siteName.length > 100) {
      return NextResponse.json({ error: 'Invalid site name format' }, { status: 400 })
    }

    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'

    try {
      await execAsync(
        `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend test -d sites/${siteName}`,
        { timeout: 10000 }
      )

      await execAsync(
        `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site ${siteName} list-apps"`,
        { timeout: 15000 }
      )

      return NextResponse.json({ ready: true, site: siteName })
    } catch {
      return NextResponse.json({ ready: false, site: siteName })
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to check site status' },
      { status: 500 }
    )
  }
}
