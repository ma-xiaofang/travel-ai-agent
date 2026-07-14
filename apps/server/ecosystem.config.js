module.exports = {
    apps: [
        {
            // 进程名称，pm2 list 中显示
            name: 'travel-ai',

            // 入口脚本（nest build 输出到 dist/src/main.js）
            script: 'dist/src/main.js',

            // 工作目录：确保 .env 及 node_modules 能被正确解析
            cwd: './',

            // 实例数量：1 个（单核 fork 模式）
            instances: 1,
            exec_mode: 'fork',

            // 环境变量
            env: {
                NODE_ENV: 'production',
            },

            // 内存超过 512MB 自动重启
            max_memory_restart: '512M',

            // 异常退出自动重启（延迟 1s 避免频繁抖动）
            autorestart: true,
            max_restarts: 10,
            restart_delay: 1000,

            // 日志配置
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // 监听文件变化（生产环境建议关闭）
            watch: false,
            ignore_watch: ['node_modules', 'logs', '.git'],
        },
    ],
}
