import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteName = searchParams.get('site')

    if (!siteName) {
      return NextResponse.json({ error: 'Site name required' }, { status: 400 })
    }

    // Check if site exists and is accessible
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'

    try {
      // Check 1: Site folder exists
      await execAsync(
        `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend test -d sites/${siteName}`,
        { timeout: 10000 }
      )

      // Check 2: Database is accessible
      await execAsync(
        `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site ${siteName} list-apps"`,
        { timeout: 15000 }
      )

      // Site is ready
      return NextResponse.json({ ready: true, site: siteName })
    } catch (error) {
      // Site not ready yet
      return NextResponse.json({ ready: false, site: siteName })
    }
  } catch (error: any) {
    console.error('Site status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check site status', details: error.message },
      { status: 500 }
    )
  }
}
