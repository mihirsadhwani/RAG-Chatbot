import unittest
import sys
import os
import subprocess
from io import StringIO
from unittest.mock import patch

# Setup sys path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from jobs import refresh_pipeline

class TestScheduler(unittest.TestCase):

    @patch('jobs.subprocess.run')
    def test_pipeline_execution(self, mock_run):
        # Mock successful subprocess execution
        mock_run.return_value.stdout = "Successful execution"
        mock_run.return_value.returncode = 0
        
        # Capture logs
        with patch('sys.stdout', new=StringIO()) as captured_out:
            refresh_pipeline()
            
        # Verify 4 scripts are executed sequentially
        self.assertEqual(mock_run.call_count, 4)
        calls = mock_run.call_args_list
        
        # Scraper check
        self.assertIn("phase1_scraper.py", calls[0][0][0][1])
        # Processor check
        self.assertIn("phase2_processor.py", calls[1][0][0][1])
        # Embedder check
        self.assertIn("phase3_embedder.py", calls[2][0][0][1])
        # Vector Store check
        self.assertIn("phase3_vector_store.py", calls[3][0][0][1])
        
if __name__ == '__main__':
    unittest.main()
