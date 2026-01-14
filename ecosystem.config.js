module.exports = {
  apps: [{
    name: 'nexus-erp',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/nexus_web',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster', // Enable cluster mode for load balancing
    autorestart: true,
    watch: false,
    max_memory_restart: '2G', // Restart if memory exceeds 2GB
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true, // Merge logs from all instances
    min_uptime: '10s', // Minimum uptime before considered stable
    max_restarts: 10, // Max restart attempts
    kill_timeout: 5000, // Time to wait before force kill (ms)
  }]
}
