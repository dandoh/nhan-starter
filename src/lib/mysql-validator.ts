/**
 * MySQL Validation and Setup for Debezium
 * Validates and configures MySQL for CDC with Debezium
 */

import * as mysql from 'mysql2/promise'

export interface MySQLValidationResult {
  step: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: string
}

export interface MySQLValidationReport {
  isReady: boolean
  results: MySQLValidationResult[]
}

/**
 * Check if MySQL binlog format is set to ROW
 */
async function checkBinlogFormat(connection: mysql.Connection): Promise<MySQLValidationResult> {
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SHOW VARIABLES LIKE 'binlog_format'"
    )
    
    if (rows.length === 0) {
      return {
        step: 'Binlog Format',
        status: 'error',
        message: 'Binary logging is not enabled',
        details: 'MySQL must have binary logging enabled for CDC'
      }
    }
    
    const value = rows[0].Value
    if (value !== 'ROW') {
      return {
        step: 'Binlog Format',
        status: 'error',
        message: `Binlog format is ${value}, must be ROW`,
        details: 'Run: SET GLOBAL binlog_format = \'ROW\';'
      }
    }
    
    return {
      step: 'Binlog Format',
      status: 'success',
      message: 'Binlog format is ROW ✓'
    }
  } catch (error) {
    return {
      step: 'Binlog Format',
      status: 'error',
      message: 'Failed to check binlog format',
      details: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Check if binlog_row_image is set to FULL
 */
async function checkBinlogRowImage(connection: mysql.Connection): Promise<MySQLValidationResult> {
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SHOW VARIABLES LIKE 'binlog_row_image'"
    )
    
    if (rows.length === 0) {
      return {
        step: 'Binlog Row Image',
        status: 'warning',
        message: 'binlog_row_image not found (may not be supported)',
        details: 'This is optional but recommended'
      }
    }
    
    const value = rows[0].Value
    if (value !== 'FULL') {
      return {
        step: 'Binlog Row Image',
        status: 'error',
        message: `Binlog row image is ${value}, should be FULL`,
        details: 'Run: SET GLOBAL binlog_row_image = \'FULL\';'
      }
    }
    
    return {
      step: 'Binlog Row Image',
      status: 'success',
      message: 'Binlog row image is FULL ✓'
    }
  } catch (error) {
    return {
      step: 'Binlog Row Image',
      status: 'error',
      message: 'Failed to check binlog row image',
      details: error instanceof Error ? error.message : String(error)
    }
  }
}


/**
 * Check user permissions for Debezium
 */
async function checkUserPermissions(
  connection: mysql.Connection, 
  username: string
): Promise<MySQLValidationResult> {
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      'SHOW GRANTS FOR CURRENT_USER()'
    )
    
    const grants = rows.map(row => Object.values(row)[0] as string).join(' ')
    
    const requiredPermissions = [
      'SELECT',
      'RELOAD',
      'SHOW DATABASES',
      'REPLICATION SLAVE',
      'REPLICATION CLIENT'
    ]
    
    const missingPermissions = requiredPermissions.filter(
      perm => !grants.toUpperCase().includes(perm)
    )
    
    if (missingPermissions.length > 0) {
      return {
        step: 'User Permissions',
        status: 'error',
        message: `Missing permissions: ${missingPermissions.join(', ')}`,
        details: `Run: GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO '${username}'@'%'; FLUSH PRIVILEGES;`
      }
    }
    
    return {
      step: 'User Permissions',
      status: 'success',
      message: 'User has all required permissions ✓'
    }
  } catch (error) {
    return {
      step: 'User Permissions',
      status: 'error',
      message: 'Failed to check user permissions',
      details: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Attempt to fix binlog format
 */
async function fixBinlogFormat(connection: mysql.Connection): Promise<MySQLValidationResult> {
  try {
    await connection.query("SET GLOBAL binlog_format = 'ROW'")
    return {
      step: 'Fix Binlog Format',
      status: 'success',
      message: 'Successfully set binlog_format to ROW ✓'
    }
  } catch (error) {
    return {
      step: 'Fix Binlog Format',
      status: 'error',
      message: 'Failed to set binlog format',
      details: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Attempt to fix binlog row image
 */
async function fixBinlogRowImage(connection: mysql.Connection): Promise<MySQLValidationResult> {
  try {
    await connection.query("SET GLOBAL binlog_row_image = 'FULL'")
    return {
      step: 'Fix Binlog Row Image',
      status: 'success',
      message: 'Successfully set binlog_row_image to FULL ✓'
    }
  } catch (error) {
    return {
      step: 'Fix Binlog Row Image',
      status: 'error',
      message: 'Failed to set binlog row image',
      details: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Attempt to grant required permissions
 */
async function fixUserPermissions(
  connection: mysql.Connection,
  username: string
): Promise<MySQLValidationResult> {
  try {
    await connection.query(
      `GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO '${username}'@'%'`
    )
    await connection.query('FLUSH PRIVILEGES')
    return {
      step: 'Fix User Permissions',
      status: 'success',
      message: 'Successfully granted required permissions ✓'
    }
  } catch (error) {
    return {
      step: 'Fix User Permissions',
      status: 'error',
      message: 'Failed to grant permissions',
      details: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Validate MySQL configuration for Debezium
 */
export async function validateMySQL(config: {
  host: string
  port: number
  username: string
  password: string
  database: string
}): Promise<MySQLValidationReport> {
  let connection: mysql.Connection | null = null
  const results: MySQLValidationResult[] = []
  
  try {
    // Test connection
    results.push({
      step: 'Database Connection',
      status: 'success',
      message: 'Attempting to connect...'
    })
    
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    })
    
    results[0] = {
      step: 'Database Connection',
      status: 'success',
      message: 'Successfully connected to MySQL ✓'
    }
    
    // Check binlog format
    const binlogFormatResult = await checkBinlogFormat(connection)
    results.push(binlogFormatResult)
    
    // Check binlog row image
    const binlogRowImageResult = await checkBinlogRowImage(connection)
    results.push(binlogRowImageResult)
    
    // Check user permissions
    const permissionsResult = await checkUserPermissions(connection, config.username)
    results.push(permissionsResult)
    
    // Determine if MySQL is ready
    const hasErrors = results.some(r => r.status === 'error')
    
    return {
      isReady: !hasErrors,
      results
    }
  } catch (error) {
    results[0] = {
      step: 'Database Connection',
      status: 'error',
      message: 'Failed to connect to MySQL',
      details: error instanceof Error ? error.message : String(error)
    }
    
    return {
      isReady: false,
      results
    }
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

/**
 * Validate and attempt to fix MySQL configuration
 */
export async function validateAndFixMySQL(config: {
  host: string
  port: number
  username: string
  password: string
  database: string
}): Promise<MySQLValidationReport> {
  let connection: mysql.Connection | null = null
  const results: MySQLValidationResult[] = []
  
  try {
    // Test connection
    results.push({
      step: 'Database Connection',
      status: 'success',
      message: 'Attempting to connect...'
    })
    
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    })
    
    results[0] = {
      step: 'Database Connection',
      status: 'success',
      message: 'Successfully connected to MySQL ✓'
    }
    
    // Check and fix binlog format
    const binlogFormatResult = await checkBinlogFormat(connection)
    results.push(binlogFormatResult)
    
    if (binlogFormatResult.status === 'error') {
      const fixResult = await fixBinlogFormat(connection)
      results.push(fixResult)
    }
    
    // Check and fix binlog row image
    const binlogRowImageResult = await checkBinlogRowImage(connection)
    results.push(binlogRowImageResult)
    
    if (binlogRowImageResult.status === 'error') {
      const fixResult = await fixBinlogRowImage(connection)
      results.push(fixResult)
    }
    
    // Check and fix user permissions
    const permissionsResult = await checkUserPermissions(connection, config.username)
    results.push(permissionsResult)
    
    if (permissionsResult.status === 'error') {
      const fixResult = await fixUserPermissions(connection, config.username)
      results.push(fixResult)
    }
    
    // Final validation check
    const finalBinlogFormat = await checkBinlogFormat(connection)
    const finalBinlogRowImage = await checkBinlogRowImage(connection)
    const finalPermissions = await checkUserPermissions(connection, config.username)
    
    const hasErrors = [finalBinlogFormat, finalBinlogRowImage, finalPermissions].some(
      r => r.status === 'error'
    )
    
    return {
      isReady: !hasErrors,
      results
    }
  } catch (error) {
    if (results.length === 0 || results[0].step === 'Database Connection') {
      results[0] = {
        step: 'Database Connection',
        status: 'error',
        message: 'Failed to connect to MySQL',
        details: error instanceof Error ? error.message : String(error)
      }
    } else {
      results.push({
        step: 'Validation',
        status: 'error',
        message: 'Unexpected error during validation',
        details: error instanceof Error ? error.message : String(error)
      })
    }
    
    return {
      isReady: false,
      results
    }
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

