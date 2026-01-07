module.exports = {
  apps: [{
    name: 'nexus-erp',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/nexus_web',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
