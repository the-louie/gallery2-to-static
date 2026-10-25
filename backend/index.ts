import * as fs from 'fs/promises'
import * as path from 'path'
import mysql from 'mysql2/promise'
import sqlUtils from './sqlUtils.ts'
import type { Config } from './types.ts'
import { findConfigErrors } from './configValidation.ts'
import { runExtraction } from './extract.ts'

// CLI: load config.json (+ MYSQL_* overrides), connect to MySQL, run the extraction, set the exit code.
let connection: mysql.Connection | null = null;

(async () => {
    try {
        console.log('Loading config...');
        const configPath = path.join(import.meta.dirname, 'config.json');
        let config: Config;
        try {
            const configFile = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(configFile) as Config;
            if (!config.mysqlSettings || !config.gallerySettings) {
                throw new Error('Missing required config fields: mysqlSettings or gallerySettings');
            }
            if (!config.mysqlSettings.host || !config.mysqlSettings.user || !config.mysqlSettings.database) {
                throw new Error('Missing required mysqlSettings fields: host, user, or database');
            }
            if (!config.gallerySettings.tablePrefix || !config.gallerySettings.columnPrefix) {
                throw new Error('Missing required gallerySettings fields: tablePrefix or columnPrefix');
            }
            const configErrors = findConfigErrors(config);
            if (configErrors.length > 0) {
                throw new Error(`Invalid config.json values:\n  - ${configErrors.join('\n  - ')}`);
            }
        } catch (error) {
            console.error('Error loading config.json:', error);
            process.exit(1);
        }

        // Environment variables override config.json for sensitive values
        if (process.env.MYSQL_HOST) config.mysqlSettings.host = process.env.MYSQL_HOST;
        if (process.env.MYSQL_USER) config.mysqlSettings.user = process.env.MYSQL_USER;
        if (process.env.MYSQL_PASSWORD) config.mysqlSettings.password = process.env.MYSQL_PASSWORD;
        if (process.env.MYSQL_DATABASE) config.mysqlSettings.database = process.env.MYSQL_DATABASE;
        if (process.env.MYSQL_PORT) config.mysqlSettings.port = parseInt(process.env.MYSQL_PORT, 10);

        console.log('Connecting to database...');
        connection = await mysql.createConnection(config.mysqlSettings);
        const sql = sqlUtils(connection, config);

        const result = await runExtraction({ sql, config, projectRoot: path.join(import.meta.dirname, '..') });
        if (!result.ok) process.exitCode = 1;
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
})();
