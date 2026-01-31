#!/usr/bin/env python3
"""
Simple migration runner for Budget Accounting System
"""
import os
import psycopg2
from config import Config
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration(migration_file):
    """Run a single migration file"""
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            database=Config.DB_NAME,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD
        )
        
        cursor = conn.cursor()
        
        # Read migration file with UTF-8 encoding
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Execute migration
        logger.info(f"✅ Running migration: {os.path.basename(migration_file)}")
        cursor.execute(sql_content)
        conn.commit()
        
        logger.info(f"✅ Migration completed successfully")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        if conn:
            conn.rollback()
            conn.close()
        return False

def main():
    """Run all migrations in the migrations directory"""
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    
    if not os.path.exists(migrations_dir):
        logger.error(f"❌ Migrations directory not found: {migrations_dir}")
        return
    
    # Get all .sql files in migrations directory
    migration_files = [f for f in os.listdir(migrations_dir) if f.endswith('.sql')]
    migration_files.sort()  # Run in alphabetical order
    
    if not migration_files:
        logger.info("ℹ️ No migration files found")
        return
    
    logger.info(f"🚀 Found {len(migration_files)} migration files")
    
    for migration_file in migration_files:
        migration_path = os.path.join(migrations_dir, migration_file)
        success = run_migration(migration_path)
        
        if not success:
            logger.error(f"❌ Stopping migrations due to failure in {migration_file}")
            break
    
    logger.info("🎉 All migrations completed!")

if __name__ == '__main__':
    main()