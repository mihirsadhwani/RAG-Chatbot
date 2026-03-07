import argparse
import sys
import os
import pytz
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

# Ensure project root is in sys.path if needed
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from jobs import refresh_pipeline

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="Mutual Fund RAG Data Refresh Scheduler")
    parser.add_argument("--run-now", action="store_true", help="Run the entire refresh pipeline immediately")
    args = parser.parse_args()

    if args.run_now:
        logger.info("Manual execution triggered via --run-now")
        refresh_pipeline()
        return

    # Setup Scheduler
    scheduler = BlockingScheduler(timezone=pytz.timezone('Asia/Kolkata'))
    
    # Add daily job at 22:30 IST
    # Because trigger args are hour=22, minute=30, it runs daily.
    scheduler.add_job(
        refresh_pipeline, 
        trigger=CronTrigger(hour=22, minute=30), 
        id="daily_fund_refresh",
        name="Daily Mutual Fund Data Refresh at 22:30 IST"
    )

    logger.info("Scheduler initialized. Waiting for scheduled jobs...")
    logger.info("Scheduled task: Daily Mutual Fund Data Refresh [Runs daily at 22:30 IST]")
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped manually.")

if __name__ == "__main__":
    main()
