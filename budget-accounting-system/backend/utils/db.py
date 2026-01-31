# ========================================
# FILE: utils/db.py
# PURPOSE: PostgreSQL Database Connection Utilities
# ========================================

import psycopg2
from psycopg2 import pool, Error
import sys
import os

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config

import logging

# Setup logging
logger = logging.getLogger(__name__)

# ===== DATABASE CONNECTION POOL =====
connection_pool = None

def initialize_pool():
    """Initialize PostgreSQL connection pool"""
    global connection_pool
    
    logger.info("🔄 Attempting to initialize database connection pool...")
    logger.info(f"📊 Database: {Config.DB_NAME}")
    logger.info(f"📊 Host: {Config.DB_HOST}:{Config.DB_PORT}")
    logger.info(f"📊 User: {Config.DB_USER}")
    
    try:
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            1,  # Minimum connections
            20,  # Maximum connections
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            database=Config.DB_NAME,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD
        )
        
        if connection_pool:
            logger.info("✅ Database connection pool created successfully")
            return True
        else:
            logger.error("❌ Connection pool is None after creation")
            return False
            
    except psycopg2.OperationalError as e:
        logger.error(f"❌ PostgreSQL connection error: {str(e)}")
        logger.error("💡 Make sure PostgreSQL is running and credentials are correct")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error creating connection pool: {str(e)}")
        return False


def get_connection():
    """Get connection from pool"""
    global connection_pool
    
    try:
        # If pool doesn't exist, try to initialize it
        if connection_pool is None:
            logger.warning("⚠️ Connection pool is None, attempting to initialize...")
            initialize_pool()
        
        # Check again after initialization attempt
        if connection_pool is None:
            raise Exception("Connection pool failed to initialize")
        
        connection = connection_pool.getconn()
        logger.info("📊 Database connection acquired from pool")
        return connection
        
    except Exception as e:
        logger.error(f"❌ Error getting connection: {str(e)}")
        raise


def release_connection(connection):
    """Return connection to pool"""
    try:
        if connection_pool and connection:
            connection_pool.putconn(connection)
            logger.info("✅ Database connection released to pool")
    except Exception as e:
        logger.error(f"❌ Error releasing connection: {str(e)}")


def execute_query(query, params=None):
    """Execute SELECT queries and return results as list of dictionaries"""
    connection = None
    cursor = None
    
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        logger.info(f"🔍 Executing query: {query[:100]}...")
        
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        # Get column names
        columns = [desc[0] for desc in cursor.description]
        
        # Convert rows to list of dictionaries
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))
        
        logger.info(f"✅ Query executed successfully. Rows returned: {len(results)}")
        return results
        
    except Exception as e:
        logger.error(f"❌ Error executing query: {str(e)}")
        raise
    finally:
        if cursor:
            cursor.close()
        if connection:
            release_connection(connection)


def execute_update(query, params=None):
    """Execute INSERT, UPDATE, DELETE queries"""
    connection = None
    cursor = None
    
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        logger.info(f"✏️ Executing update: {query[:100]}...")
        
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        connection.commit()
        rows_affected = cursor.rowcount
        
        logger.info(f"✅ Update executed successfully. Rows affected: {rows_affected}")
        return rows_affected
        
    except Exception as e:
        if connection:
            connection.rollback()
        logger.error(f"❌ Error executing update: {str(e)}")
        raise
    finally:
        if cursor:
            cursor.close()
        if connection:
            release_connection(connection)

def execute_insert(query, params=None):
    """Execute INSERT queries with RETURNING clause and commit"""
    connection = None
    cursor = None
    
    try:
        connection = get_connection()
        cursor = connection.cursor()
        
        logger.info(f"➕ Executing insert: {query[:100]}...")
        
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        # COMMIT the transaction
        connection.commit()
        logger.info("✅ Insert committed to database")
        
        # Get the returned row
        if cursor.description:
            columns = [desc[0] for desc in cursor.description]
            row = cursor.fetchone()
            if row:
                result = dict(zip(columns, row))
                logger.info(f"✅ Insert successful. Returned: {result}")
                return [result]  # Return as list for consistency
        
        return []
        
    except Exception as e:
        if connection:
            connection.rollback()
            logger.error("❌ Transaction rolled back")
        logger.error(f"❌ Error executing insert: {str(e)}")
        raise
    finally:
        if cursor:
            cursor.close()
        if connection:
            release_connection(connection)


def test_connection():
    """Test database connection and return PostgreSQL version"""
    try:
        logger.info("🧪 Testing database connection...")
        
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT version();')
        db_version = cursor.fetchone()[0]
        cursor.close()
        release_connection(connection)
        
        logger.info(f"✅ Database connection test successful")
        return f"PostgreSQL version: {db_version}"
        
    except Exception as e:
        logger.error(f"❌ Database connection test failed: {str(e)}")
        raise


# ===== INITIALIZE POOL ON MODULE LOAD =====
logger.info("🚀 Loading database module...")
try:
    initialize_pool()
except Exception as e:
    logger.error(f"❌ Failed to initialize pool on module load: {str(e)}")
    logger.error("⚠️ Database connection will be attempted on first use")
