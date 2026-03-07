import os
import subprocess
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Base project directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def run_script(script_rel_path, phase_folder):
    """
    Run a python script synchronously and stream its output.
    Returns True if successful, False if the script fails.
    """
    script_path = os.path.join(PROJECT_ROOT, phase_folder, script_rel_path)
    cwd = os.path.join(PROJECT_ROOT, phase_folder)
    
    if not os.path.exists(script_path):
        logger.error(f"Script not found: {script_path}")
        return False
        
    logger.info(f"Executing: {script_rel_path}")
    
    try:
        # Run process, wait for it to finish, and raise exception on non-zero exit code
        result = subprocess.run(
            ["python", script_rel_path], 
            cwd=cwd, 
            check=True,
            capture_output=True,
            text=True
        )
        logger.debug(f"{script_rel_path} Output:\n{result.stdout}")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to execute {script_rel_path}")
        logger.error(f"Error output:\n{e.stderr}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error running {script_rel_path}: {e}")
        return False

def refresh_pipeline():
    """
    Run the full data refresh pipeline sequentially.
    """
    logger.info("Scheduler started: Daily Mutual Fund Data Refresh")
    
    # Step 1: Web Scraping
    logger.info("Scraping started")
    if not run_script("phase1_scraper.py", "phase1_ingestion"):
        logger.error("Scraping failed. Stopping pipeline. Will retry next day.")
        return
        
    # Step 2: Data Processing
    logger.info("Processing started")
    if not run_script("phase2_processor.py", "phase2_processing"):
        logger.error("Processing failed. Stopping pipeline. Will retry next day.")
        return
        
    # Step 3: Embeddings generation
    logger.info("Embedding generation started")
    if not run_script("phase3_embedder.py", "phase3_embeddings"):
        logger.error("Embedding generation failed. Stopping pipeline. Will retry next day.")
        return
        
    # Step 4: Vector DB Update
    # For this project, vector store loading might be a separate script 
    # phase3_embeddings/phase3_vector_store.py
    logger.info("Vector database updated started")
    if not run_script("phase3_vector_store.py", "phase3_embeddings"):
        logger.error("Vector database update failed. Stopping pipeline. Will retry next day.")
        return
        
    logger.info("Scheduler completed: Vector database successfully updated with fresh data.")
